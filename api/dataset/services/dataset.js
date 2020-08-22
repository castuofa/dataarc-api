'use strict';

const nestedIndicator = ' --> ';

const _ = require('lodash');
const fs = require('fs');
const flatten = require('flat');
const turf = require('@turf/turf');
const pug = require('pug');

// helper functions
let logtime = (start) => {
  let end = process.hrtime(start);
  strapi.log.info('Execution time: %ds %dms', end[0], end[1] / 1000000);
};

module.exports = {
  process: async (params) => {
    let start_all = process.hrtime();

    // find the entry, set to processing, flag for refresh
    const entry = await strapi.query('dataset').update(params, {
      process: 'active',
      process_notes: 'Currently processing dataset.',
    });

    // only proceed if we found an entry
    if (entry != null) {
      // flag related combinators for refresh
      strapi.services.helper.set_state(
        { dataset: entry.id },
        'combinator',
        'refresh',
        'pending',
        'Dataset has been updated, needs refreshed'
      );

      let start_cleanup = process.hrtime();
      // remove existing fields for this dataset
      strapi.log.info(`Removing existing fields and features for this dataset`);
      await strapi.services.helper.delete_many('dataset-field', {
        dataset: entry.id,
      });
      // await strapi.query('dataset-field').delete({
      //   dataset: entry.id,
      //   _limit: 999999999,
      // });

      // remove existing features for this dataset
      await strapi.services.helper.delete_many('feature', {
        dataset: entry.id,
      });
      // await strapi.query('feature').delete({
      //   dataset: entry.id,
      //   _limit: 999999999,
      // });
      logtime(start_cleanup);

      // read file
      const path = `${strapi.dir}/public${entry.source.url}`;
      const dataset = entry.source.name;

      // let folder = `${strapi.dir}/../dataarc-data/source/dataset/`;
      // let datasets = [];
      // fs.readdirSync(folder).forEach((file) => {
      //   if (file !== '.DS_Store') datasets.push(file);
      // });
      // let dataset = datasets[12];
      // strapi.log.info(`Processing ${dataset}`);
      // const path = `${strapi.dir}/../dataarc-data/source/dataset/${dataset}`;

      let source;
      try {
        source = JSON.parse(fs.readFileSync(path, 'utf8'));
        source = turf.featureCollection(source.features);
      } catch (e) {
        throw new Error(
          `There was a problem parsing the JSON file in ${entry.name}`
        );
      }

      let extract_properties = (
        input,
        keys,
        fields,
        properties = {},
        words = [],
        parent = ''
      ) => {
        // flatten properties
        let props = flatten(input, {
          delimiter: nestedIndicator,
          safe: true,
        });

        // loop through the properties
        _.forOwn(props, function (value, key) {
          let source = (parent ? parent + nestedIndicator : '') + key;
          let type = strapi.services.helper.get_type(value);
          let path = strapi.services.helper.get_name(source);
          let store_property = false;

          // process based on the type
          switch (type) {
            case 'string':
              value = value.trim();

              // don't process if empty string
              if (value === '') break;

              store_property = true;
              break;
            case 'number':
              store_property = true;
              break;
            case 'boolean':
              store_property = true;
              break;
            case 'array':
              if (_.isEmpty(value)) break;

              // loop through array
              let values = [];
              for (var i = value.length; i--; ) {
                let item_type = strapi.services.helper.get_type(value[i]);
                if (item_type === 'object') {
                  let p = {};
                  // extract properties
                  extract_properties(value[i], keys, fields, p, words, path);
                  values.push(p);
                } else {
                  strapi.log.warn(
                    `Array item is not object ${JSON.stringify(value[i])}`
                  );
                  values.push(value[i]);
                }
              }
              value = values;
              store_property = true;
              break;
            default:
              // ignore null, undefined, and other types
              store_property = false;
              break;
          }

          // process the property
          if (store_property) {
            let field = {
              title: strapi.services.helper.get_title(entry.name + ' ' + path),
              path: path,
              source: source,
              type: type,
              dataset: entry.id,
            };

            // build keywords
            if (type === 'string' && isNaN(value)) {
              words.push(strapi.services.helper.get_keyword(value));
            }

            // add to keys/fields if its new
            if (keys.indexOf(path) === -1) {
              keys.push(path);
              fields.push(field);
              // strapi.log.info(`Found new ${field.type} field ${field.path}`);
            }

            // add the property to the new feature using the clean path
            properties[path] = value;
          }
        });

        return { keys, fields, properties, words };
      };

      let keys = [];
      let fields = [];
      let features = [];

      let start_features = process.hrtime();
      _.each(source.features, function (f) {
        let properties = {};
        let words = [];

        // extract properties
        extract_properties(f.properties, keys, fields, properties, words);

        // extract cooridnates from feature
        let coords = [null, null, null];
        try {
          coords = turf.getCoord(f);
          coords[0] = Math.round(coords[0] * 1e7) / 1e7;
          coords[1] = Math.round(coords[1] * 1e7) / 1e7;
        } catch (err) {
          strapi.log.warn(`Found invalid coordinates`);
        }

        // process words to make sure we have unique values
        let keywords = _.uniq(words.join(' ').split(' ')).join(' ');

        // push the new feature object
        features.push({
          dataset: entry.id,
          properties: properties,
          latitude: coords[1],
          longitude: coords[0],
          keywords: keywords,
        });
      });

      strapi.log.info(`Done processing features`);
      logtime(start_features);

      let start_create = process.hrtime();
      // create new fields
      strapi.log.info(`Creating ${fields.length} fields`);
      await strapi.services.helper.insert_many('dataset-field', fields);
      // if (Array.isArray(fields))
      //   await Promise.all(fields.map(strapi.query('dataset-field').create));

      // create new features
      strapi.log.info(`Creating ${features.length} features`);
      await strapi.services.helper.insert_many('feature', features);
      // if (Array.isArray(features))
      //   await Promise.all(features.map(strapi.query('feature').create));
      logtime(start_create);

      // show information about processed dataset
      strapi.log.info(`Finished processing ${dataset}`);
      logtime(start_all);
      strapi.log.info(
        `Processed ${fields.length} fields in ${features.length} features`
      );

      //
      //
      //
      // show fields
      // strapi.log.info(`Fields:`);
      // console.log(`${JSON.stringify(fields, null, 2)}`);

      // show a random record for spot checking
      // strapi.log.info(`Showing random record:`);
      // console.log(`${JSON.stringify(_.sample(features), null, 2)}`);
      //
      //
      // country
      // sampledata-sample_name
      // sampledata-site_name
    }

    return entry;
  },

  refresh: async (params) => {
    // find the entry
    const entry = await strapi.query('dataset').findOne(params);
    if (entry != null) {
      // set refresh to active
      strapi.services.helper.set_state(
        entry.id,
        'dataset',
        'refresh',
        'active',
        'Dataset refresh in progress'
      );

      // pull the dataset fields
      const fields = await strapi
        .query('dataset-field')
        .find({ dataset: entry.id });

      // pull the datasets features
      const features = await strapi
        .query('feature')
        .find({ dataset: entry.id });

      if (fields && features) {
        _.each(features, function (feature) {
          // set temporal values
          let start_date = _.find(fields, {
            type: 'start_date',
          });
          if (start_date) {
            feature.start_date = feature.properties[start_date.path];
          }
          let end_date = _.find(fields, {
            type: 'end_date',
          });
          if (end_date) {
            feature.end_date = feature.properties[end_date.path];
          }
          let text_date = _.find(fields, {
            type: 'text_date',
          });
          if (text_date) {
            feature.text_date = feature.properties[text_date.path];
          }

          // set url and link values
          let url = _.find(fields, {
            type: 'url',
          });
          if (url) {
            feature.url = feature.properties[url.path];
            feature.link = pug.render(
              `a(href='${feature.url}'). \n  ` + feature.dataset.link_layout,
              feature.properties
            );
          }

          // set layout values
          // 1. load layouts
          feature.title = pug.render(
            'span. \n  ' + feature.dataset.title_layout,
            feature.properties
          );
          feature.summary = pug.render(
            feature.dataset.summary_layout,
            feature.properties
          );
          // feature.details = pug.render(
          //   feature.dataset.details_layout,
          //   feature.properties
          // );

          // 2. render layouts with pug

          strapi.log.info(`Title: ${feature.title}`);
          strapi.log.info(`Link: ${feature.link}`);
          strapi.log.info(`Summary: ${feature.summary}`);
          strapi.log.info(`Details: ${feature.details}`);
          // console.log(`${JSON.stringify(feature.properties, null, 2)}`);

          // update the feature
          strapi.query('feature').update({ id: feature.id }, feature);
        });
      }

      // set refresh to complete
      strapi.services.helper.set_state(
        entry.id,
        'dataset',
        'refresh',
        'complete'
      );
    }

    return entry;
  },
};
