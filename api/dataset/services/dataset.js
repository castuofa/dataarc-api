'use strict';

let flatten = require('flat');

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
    const entry = await strapi.query('dataset').findOne(params);

    if (entry != null) {
      // remove existing fields for this dataset
      strapi.log.info(`Removing existing fields for this dataset`);
      await strapi.query('dataset-field').delete({
        dataset: entry.id,
        _limit: 999999,
      });

      // read file
      const fs = require('fs');
      const path = `${strapi.dir}/public${entry.source.url}`;
      const source = JSON.parse(fs.readFileSync(path, 'utf8'));

      // function to determine property type
      let types = {
        get: (prop) => {
          return Object.prototype.toString
            .call(prop)
            .match(/\s([a-zA-Z]+)/)[1]
            .toLowerCase();
        },
      };

      // flatten the fields
      let properties = {};
      source.features.forEach((feature) => {
        properties = flatten(feature.properties);
      });

      // map fields to the correct format
      let fields = [];
      Object.keys(properties).forEach((property) => {
        fields.push({
          name: property,
          title: property,
          type: types.get(properties[property]),
          dataset: entry.id,
        });
      });

      // create new fields
      strapi.log.info(`Creating ${fields.length} fields`);
      if (Array.isArray(fields))
        await Promise.all(fields.map(strapi.query('dataset-field').create));
    }

    return entry;
  },
};
