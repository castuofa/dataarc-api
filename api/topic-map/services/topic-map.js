'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
  /**
   * Promise to process a record
   *
   * @return {Promise}
   */
  process: async (params) => {
    const entry = await strapi.query('topic-map').findOne(params);

    if (entry != null) {
      // remove existing topics for this map
      strapi.log.info(`Removing existing topics for this map`);
      await strapi.query('topic').delete({
        map: entry.id,
        _limit: 999999,
      });

      // read file
      const fs = require('fs');
      const path = `${strapi.dir}/public${entry.source.url}`;
      const map = JSON.parse(fs.readFileSync(path, 'utf8'));

      // map nodes to the correct format
      let topics = map.nodes.map((node) => {
        return {
          identifier: node.id.toString(),
          name: node.title,
          map: entry.id,
        };
      });

      // create new topics
      strapi.log.info(`Creating ${map.nodes.length} topics`);
      if (Array.isArray(topics))
        await Promise.all(topics.map(strapi.query('topic').create));
    }

    return entry;
  },
};
