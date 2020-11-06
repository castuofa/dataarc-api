'use strict';

const _ = require('lodash');
const chalk = require('chalk');

const log = (msg, time) => {
  if (time) time = Math.ceil(Date.now() - time);
  strapi.log.debug(`${msg} (${time} ms)`);
};

module.exports = {
  addTopics: async (topics) => {
    let start = Date.now();
    return strapi
      .query('concept-topic')
      .model.insertMany(topics)
      .then((res) => {
        log(`Topics successfully added`, start);
      });
  },

  removeTopics: async (id) => {
    let start = Date.now();
    return strapi
      .query('concept-topic')
      .model.deleteMany({ map: id })
      .then((res) => {
        log(`Topics successfully removed`, start);
      });
  },

  removeEdges: async (id) => {
    let start = Date.now();
    return strapi
      .query('concept-map')
      .update({ id }, { edges: null })
      .then((res) => {
        log(`Edges successfully removed`, start);
      });
  },

  // set processed_at
  setProcess: async (id, value) => {
    let start = Date.now();
    let processing = value ? false : true;
    return strapi
      .query('concept-map')
      .update({ id: id }, { processed_at: value, processing: processing })
      .then((res) => {
        log(`Processing ${processing ? 'started' : 'complete'}`, start);
      });
  },

  // process
  process: async (entity) => {
    let start = Date.now();
    let source = await strapi.services['helper'].loadSource(entity.source);
    let schema = await strapi.services['helper'].getSchema('concept-map');
    let valid = await strapi.services['helper'].checkSource(schema, source);
    if (!valid) throw new Error('Invalid source');

    // clear processed_at field
    strapi.services['concept-map'].setProcess(entity.id, null);

    // remove existing topics
    await strapi.services['concept-map'].removeTopics(entity.id);

    // process the data
    let promises = [];
    _.map(source.nodes, async (data) => {
      promises.push(strapi.services['concept-map'].processNode(entity, data));
    });

    // make sure all promises have been settled
    await Promise.allSettled(promises).then((res) => {
      let results = _.groupBy(res, 'status');

      // log the results
      let fulfilled = results.fulfilled ? results.fulfilled.length : 0;
      let rejected = results.rejected ? results.rejected.length : 0;
      log(
        `${chalk.green(fulfilled)} PROCESSED, ${chalk.red(rejected)} REJECTED`,
        start
      );

      // add
      start = Date.now();
      let topics = _.map(results.fulfilled, 'value');
      return strapi.services['concept-map'].addTopics(topics);
    });

    // log the result
    log(`Concept topics inserted`, start);

    // set the process datetime / boolean
    strapi.services['concept-map'].setProcess(entity.id, Date.now());

    return '';
  },

  processNode: async (map, node) => {
    let start = Date.now();
    let topic = {
      identifier: node.id.toString(),
      title: node.title,
      map: map.id,
    };
    console.log('node');

    let concept = await strapi.query('concept').findOne({ name: node.title });
    if (concept != null) {
      log(`Found matching concept ${concept.title}`, start);
      topic.concept = concept.id;
    }

    return topic;
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
