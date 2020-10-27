'use strict';

const _ = require('lodash');

module.exports = {
  removeTopics: async (id) => {
    // remove topics from the concept mapp
    strapi.log.debug(`Removing existing topics for this map`);
    return strapi.query('concept-topic').model.deleteMany({ map: id });
  },

  removeLinks: async (id) => {
    // remove topics from the concept mapp
    strapi.log.debug(`Removing all existing links`);
    return strapi.query('concept-link').model.deleteMany({});
  },

  afterDelete: async (id) => {
    // delete related data
    strapi.services['concept-map'].removeTopics(id);
    strapi.services['concept-map'].removeLinks(id);
  },

  processNode: async (map, node) => {
    let topic = {
      identifier: node.id.toString(),
      name: node.title,
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
    let link = {
      source_topic: edge.source.toString(),
      target_topic: edge.target.toString(),
      title: edge.title,
      map: map.id,
    };

    let source = await strapi
      .query('concept-topic')
      .findOne({ identifier: link.source_topic });
    if (source && source.concept) link.source_concept = source.concept.id;

    let target = await strapi
      .query('concept-topic')
      .findOne({ identifier: link.target_topic });
    if (target && target.concept) link.target_concept = target.concept.id;

    if (link.source_concept && link.target_concept)
      await strapi.query('concept-link').create(link);
  },

  activateMap: async (map) => {
    // create nodes and edges objects and store them in the map
    let topics = await strapi.query('concept-topic').find({ map: map.id });
    let nodes = [];
    _.each(topics, (topic) => {
      if (topic.concept)
        nodes.push({
          id: topic.concept.id,
          title: topic.concept.title,
        });
    });
    map.nodes = nodes;

    let links = await strapi.query('concept-link').find({ map: map.id });
    let edges = [];
    _.each(links, (link) => {
      if (link.source_concept && link.target_concept)
        edges.push({
          source: link.source_concept.id,
          target: link.target_concept.id,
          title: link.name,
        });
    });
    map.edges = edges;

    // deactivate any maps
    await strapi.query('concept-map').model.updateMany({}, { active: false });

    // activate the map and update
    map.active = true;
    await strapi.query('concept-map').update({ id: map.id }, map);
  },
};
