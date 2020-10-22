'use strict';

module.exports = {
  process: async (params) => {
    const entry = await strapi.query('concept-map').findOne(params);

    if (entry != null) {
      // remove existing topics for this map
      strapi.log.info(`Removing existing topics for this map`);
      await strapi.query('topic').delete({
        topic_map: entry.id,
        _limit: 999999,
      });

      // read file
      const path = `${strapi.dir}/public${entry.source.url}`;
      const source = strapi.services.helper.load_json(path);

      // get the nodes and edges
      const nodes = source.nodes;
      const edges = source.edges;

      console.log(` ### Looping Nodes ### `);

      // map nodes to the correct format
      let topics = nodes.map((node) => {
        let concept = strapi.query('concept').findOne({ name: node.title });
        return {
          identifier: node.id.toString(),
          name: node.title,
          concept: concept.id,
          topic_map: entry.id,
        };
      });

      // create new topics
      strapi.log.info(`Creating ${nodes.length} topics`);
      // if (Array.isArray(topics))
      //   await Promise.all(topics.map(strapi.query('topic').create));
    }

    return entry;
  },
};
