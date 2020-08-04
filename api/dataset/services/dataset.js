'use strict';

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
      const nestedIndicator = ' --> ';
      const path = `${strapi.dir}/public${entry.source.url}`;
      let source;
      try {
        source = JSON.parse(fs.readFileSync(path, 'utf8'));
      } catch (e) {
        throw new Error(
          `There was a problem parsing the JSON file in ${entry.name}`
        );
      }

      // helper function
      let helper = {
        type: (prop) => {
          return Object.prototype.toString
            .call(prop)
            .match(/\s([a-zA-Z]+)/)[1]
            .toLowerCase();
        },
        clean_type: (prop) => {
          let allowed = ['string', 'number', 'boolean'];
          let type = helper.type(prop);
          if (!allowed.includes(type)) return 'string';
          return type;
        },
        flatten: (objectOrArray, prefix = '', formatter = (k) => k) => {
          const nestedFormatter = (k) => nestedIndicator + k;
          const nestElement = (prev, value, key) =>
            value && typeof value === 'object'
              ? {
                  ...prev,
                  ...helper.flatten(
                    value,
                    `${prefix}${formatter(key)}`,
                    nestedFormatter
                  ),
                }
              : { ...prev, ...{ [`${prefix}${formatter(key)}`]: value } };

          return Array.isArray(objectOrArray)
            ? objectOrArray.reduce(nestElement, {})
            : Object.keys(objectOrArray).reduce(
                (prev, element) =>
                  nestElement(prev, objectOrArray[element], element),
                {}
              );
        },
      };

      // go through all the features, get all the fields
      let keys = [];
      let fields = [];
      let regex = new RegExp(nestedIndicator + '\\d+', 'g');
      source.features.forEach((feature) => {
        let p = helper.flatten(feature.properties);
        Object.keys(p).forEach((k) => {
          let key = k.replace(regex, '');
          if (keys.indexOf(key) === -1) {
            fields.push({
              title: key
                .replace(regex, '')
                .replace(new RegExp(nestedIndicator, 'g'), ' '),
              path: key.replace(regex, ''),
              type: helper.clean_type(p[key]),
              dataset: entry.id,
            });
            keys.push(key);
          }
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
