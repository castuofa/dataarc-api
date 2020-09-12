'use strict';

const nestedIndicator = ' --> ';

const _ = require('lodash');
const fs = require('fs');
const flatten = require('flat');
const turf = require('@turf/turf');
const pug = require('pug');

module.exports = {
  process: async (params) => {
    // find the entry
    const entry = await strapi.query('dataset').findOne(params);
    if (entry != null) {
      // set process to active and start processing
      strapi.services.helper.set_state(
        entry.id,
        'dataset',
        'processing',
        'Dataset processing in progress'
      );

      // read source file
      let source;
      try {
        let contents = fs.readFileSync(
          `${strapi.dir}/public${entry.source.url}`,
          'utf8'
        ); // read the file syncronously
        contents = contents.trim(); // remove strange characters
        source = JSON.parse(contents); // parse json
        source = turf.featureCollection(source.features); // pull out valid geojson features
      } catch (err) {
        throw new Error(
          `There was a problem parsing the JSON file in ${entry.name}`
        );
      }

      // main function called to extract the properties
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
          let title = strapi.services.helper.get_title(entry.name + ' ' + path);
          let name = strapi.services.helper.get_name(title);
          let store_property = false;

          // process based on the type
          switch (type) {
            case 'string':
              value = value.trim();
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
              let values = [];
              for (var i = value.length; i--; ) {
                let item_type = strapi.services.helper.get_type(value[i]);
                if (item_type === 'object') {
                  let p = {};
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
              name: name,
              title: title,
              path: path,
              source: source,
              type: type,
              state: 'pending',
              state_msg: 'New field, pending verification',
              state_at: Date.now(),
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

      // loop through the source features to build our fields and new features
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

      // remove existing fields and features for this dataset then create new
      Promise.allSettled([
        strapi.services.helper.delete_many('dataset-field', {
          dataset: entry.id,
        }),
        strapi.services.helper.delete_many('feature', {
          dataset: entry.id,
        }),
      ]).then(
        Promise.allSettled([
          strapi.services.helper.insert_many('dataset-field', fields),
          strapi.services.helper.insert_many('feature', features),
        ]).then((results) => {
          // check to make sure all promises were fulfilled
          _.each(results, (result) => {
            if (result.status != 'fulfilled') {
              // have to set the state here instaed of throw an error
              // since these contine to run after the function returns
              strapi.services.helper.set_state(
                entry.id,
                'dataset',
                'failed',
                'Something went wrong, please try again'
              );
              return entry;
            }
          });

          // after dataset has been processed, refresh the features
          strapi.services.dataset.refresh({ id: entry.id });

          // set processs to complete
          strapi.services.helper.set_state(entry.id, 'dataset', 'done');

          // set state to pending for related combinaotors
          strapi.services.helper.set_state(
            { dataset: entry.id },
            'combinator',
            'pending',
            'Dataset has been updated, please verify all combinator settings'
          );

          // show information about processed dataset
          strapi.log.info(
            `Processed ${fields.length} fields in ${features.length} features`
          );
        })
      );
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
        'updating',
        'Updating dataset features'
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

          // set url and render link
          let url = _.find(fields, {
            type: 'url',
          });
          if (url) {
            feature.url = feature.properties[url.path];
            try {
              feature.link = pug.render(
                `a(href='${feature.url}'). \n  ` + feature.dataset.link_layout,
                feature.properties
              );
            } catch (err) {
              feature.link = 'Invalid layout';
            }
          }

          // render title
          try {
            feature.title = pug.render(
              'span. \n  ' + feature.dataset.title_layout,
              feature.properties
            );
          } catch (err) {
            feature.title = 'Invalid layout';
          }

          // render summary
          try {
            feature.summary = pug.render(
              feature.dataset.summary_layout,
              feature.properties
            );
          } catch (err) {
            feature.summary = 'Invalid layout';
          }

          // render details
          try {
            feature.details = pug.render(
              feature.dataset.details_layout,
              feature.properties
            );
          } catch (err) {
            feature.details = 'Invalid layout';
          }

          // update the feature
          strapi.query('feature').update({ id: feature.id }, feature);
        });
      }

      // set refresh to complete
      strapi.services.helper.set_state(entry.id, 'dataset', 'done');
    }

    return entry;
  },
};
