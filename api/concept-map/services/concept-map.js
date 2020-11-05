'use strict';

const _ = require('lodash');

module.exports = {
  removeTopics: async (id) => {
    strapi.log.debug(`Removing existing topics for this map`);
    return strapi.query('concept-topic').model.deleteMany({ map: id });
  },

  removeEdges: async (id) => {
    strapi.log.debug(`Removing all existing edges`);
    return strapi.query('concept-map').update({ id }, { edges: null });
  },

  processNode: async (map, node) => {
    let topic = {
      identifier: node.id.toString(),
      title: node.title,
      map: map.id,
    };

    let concept = await strapi.query('concept').findOne({ name: node.title });
    if (concept != null) {
      strapi.log.debug(`Found matching concept ${concept.title}`);
      topic.concept = concept.id;
    }

    strapi.query('concept-topic').create(topic);
  },

  processEdge: async (map, edge) => {
    let source = await strapi
      .query('concept-topic')
      .findOne({ identifier: edge.source.toString() });

    let target = await strapi
      .query('concept-topic')
      .findOne({ identifier: edge.target.toString() });

    // console.log(
    //   `${edge.source} -> ${edge.target} -- ${source.concept} -> ${target.concept}`
    // );

    if (source.concept && target.concept)
      return {
        title: edge.title,
        source: source.concept,
        target: target.concept,
      };
    return;
  },

  activateMap: async (map, edges) => {
    // create nodes and edges objects and store them in the map
    let concepts = await strapi.query('concept').find({ _limit: 999999 });
    let nodes = [];

    _.each(concepts, (concept) => {
      nodes.push({
        id: concept.id,
        title: concept.title,
      });
    });
    map.nodes = nodes;
    map.edges = edges;

    // get related
    let src = _.groupBy(edges, 'source');
    let tgt = _.groupBy(edges, 'target');
    let keys = _.union(Object.keys(src), Object.keys(tgt));
    let related = {};
    _.each(keys, (key) => {
      related[key] = _.union(
        _.map(src[key], 'target'),
        _.map(tgt[key], 'source')
      );
    });

    // get contextual
    let contextual = {};
    _.each(related, (value, key) => {
      let ctx = [];
      _.each(value, (id) => {
        ctx = _.union(ctx, _.difference(related[id], [key]));
        // ctx = _.union(ctx, related[id]);
      });
      if (!_.isEmpty(ctx)) contextual[key] = ctx;
    });

    // loop through the keys and update related/contextual
    _.each(keys, (key) => {
      let concept = {};
      if (!_.isEmpty(related[key])) concept.related = related[key];
      if (!_.isEmpty(contextual[key])) concept.contextual = contextual[key];
      strapi.query('concept').update({ id: key }, concept);
    });

    // deactivate any maps
    await strapi.query('concept-map').model.updateMany({}, { active: false });

    // activate the map and update
    map.active = true;
    await strapi.query('concept-map').update({ id: map.id }, map);
  },
};
