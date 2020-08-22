'use strict';

const nestedIndicator = ' --> ';

// helper libs
const _ = require('lodash');
const fs = require('fs');
const flatten = require('flat');
const turf = require('@turf/turf');
const slugify = require('slugify');
const pug = require('pug');

// helper functions
let helper = {
  type: (prop) => {
    return Object.prototype.toString
      .call(prop)
      .match(/\s([a-zA-Z]+)/)[1]
      .toLowerCase();
  },
  path: (words, wordSeparator = '_', pathSeparator = '_') => {
    return words
      .split(nestedIndicator)
      .map((word) => {
        return slugify(word.replace(/[\/\\\-_*+~.()'"!:@\?\s+]/g, ' '), {
          replacement: wordSeparator,
          lower: true,
          strict: true,
          remove: /[\/\\*+~.()'"!:@\?]/g,
        });
      })
      .join(pathSeparator);
  },
  title: (path) => {
    return path
      .replace(/[\[\]-_.]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\w\S*/g, (s) => {
        return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase();
      });
  },
  keyword: (value) => {
    return helper
      .path(
        value
          .replace(/https?:\/\/(www\.)?/g, '')
          .replace(
            /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
            ''
          ),
        ' '
      )
      .replace(/\d+/g, ' ')
      .replace(/\s\s+/g, ' ')
      .trim();
  },
  layout: (value, fields, properties) => {
    _.each(fields, function (field) {
      value = value.replace(/\#\{{field.path}\}/g, properties[field.path]);
    });
    return value;
  },
  random: (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
  },
  logtime: (start) => {
    let end = process.hrtime(start);
    strapi.log.info('Execution time (hr): %ds %dms', end[0], end[1] / 1000000);
  },
};

module.exports = {
  create: async (data, { files } = {}) => {
    const entry = await strapi.query('dataset').create(data);

    // set process and refresh state
    strapi.services.dataset.process_state(
      entry.id,
      'pending',
      'Dataset has been updated, needs processing.'
    );
    strapi.services.dataset.refresh_state(
      entry.id,
      'pending',
      'Dataset has been updated, needs refreshed.'
    );

    if (files) {
      // automatically uploads the files based on the entry and the model
      await strapi.entityService.uploadFiles(entry, files, {
        model: 'dataset',
      });
      return this.findOne({ id: entry.id });
    }

    return entry;
  },

  update: async (params, data, { files } = {}) => {
    const entry = await strapi.query('dataset').update(params, data);

    // set process and refresh state
    strapi.services.dataset.process_state(
      entry.id,
      'pending',
      'Dataset has been updated, needs processing.'
    );
    strapi.services.dataset.refresh_state(
      entry.id,
      'pending',
      'Dataset has been updated, needs refreshed.'
    );

    if (files) {
      // automatically uploads the files based on the entry and the model
      await strapi.entityService.uploadFiles(entry, files, {
        model: 'dataset',
      });
      return this.findOne({ id: entry.id });
    }

    return entry;
  },

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
      strapi.query('combinator').update(
        { dataset: entry.id },
        {
          refresh: 'pending',
          refresh_notes: 'Dataset has been processed, refresh is needed.',
        }
      );

      let start_cleanup = process.hrtime();
      // remove existing fields for this dataset
      strapi.log.info(`Removing existing fields and features for this dataset`);
      await strapi.query('dataset-field').delete({
        dataset: entry.id,
        _limit: 999999999,
      });

      // remove existing features for this dataset
      await strapi.query('feature').delete({
        dataset: entry.id,
        _limit: 999999999,
      });
      helper.logtime(start_cleanup);

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
          let type = helper.type(value);
          let path = helper.path(source);
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
                let item_type = helper.type(value[i]);
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
              title: helper.title(entry.name + ' ' + path),
              path: path,
              source: source,
              type: type,
              dataset: entry.id,
            };

            // build keywords
            if (type === 'string' && isNaN(value)) {
              words.push(helper.keyword(value));
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
      helper.logtime(start_features);

      let start_create = process.hrtime();
      // create new fields
      strapi.log.info(`Creating ${fields.length} fields`);
      if (Array.isArray(fields))
        await Promise.all(fields.map(strapi.query('dataset-field').create));

      // create new features
      strapi.log.info(`Creating ${features.length} features`);
      if (Array.isArray(features))
        await Promise.all(features.map(strapi.query('feature').create));
      helper.logtime(start_create);

      // show information about processed dataset
      strapi.log.info(`Finished processing ${dataset}`);
      helper.logtime(start_all);
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
      // let random_record = helper.random(0, features.length - 1);
      // strapi.log.info(`Showing random record ${random_record}:`);
      // console.log(`${JSON.stringify(features[0], null, 2)}`);
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
      strapi.services.dataset.refresh_state(
        entry.id,
        'active',
        'Dataset refresh in progress.'
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
          // strapi.log.info(`Feature ${feature.id}`);
          // console.log(`${JSON.stringify(feature.properties, null, 2)}`);

          // set temporal values
          let start_date = _.find(fields, { type: 'start_date' });
          if (start_date) {
            feature.start_date = feature.properties[start_date.path];
          }
          let end_date = _.find(fields, { type: 'end_date' });
          if (end_date) {
            feature.end_date = feature.properties[end_date.path];
          }
          let text_date = _.find(fields, { type: 'text_date' });
          if (text_date) {
            feature.text_date = feature.properties[text_date.path];
          }

          // set url value
          let url = _.find(fields, { type: 'url' });
          if (url) {
            feature.url = feature.properties[url.path];
          }

          // set layout values
          // 1. load layouts
          feature.title = pug.render(
            feature.dataset.title_layout,
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
          feature.link = pug.render(
            feature.dataset.link_layout,
            feature.properties
          );
          // 2. render layouts with pug

          // update the feature
          strapi.query('feature').update({ id: feature.id }, feature);
        });
      }

      // set refresh to complete
      strapi.services.dataset.refresh_state(entry.id, 'complete');
    }

    return entry;
  },

  process_state: async (id, state, notes = '') => {
    strapi.query('dataset').update(
      {
        id: id,
      },
      {
        process: state,
        process_notes: notes,
        process_at: Date.now(),
      }
    );
  },

  refresh_state: async (id, state, notes = '') => {
    strapi.query('dataset').update(
      {
        id: id,
      },
      {
        refresh: state,
        refresh_notes: notes,
        refresh_at: Date.now(),
      }
    );
  },
};
