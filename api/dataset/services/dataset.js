'use strict';

const _ = require('lodash');
const fs = require('fs');
const flatten = require('flat');
const turf = require('@turf/turf');
const slugify = require('slugify');

const nestedIndicator = ' --> ';

// helper functions
let helper = {
  type: (prop) => {
    return Object.prototype.toString
      .call(prop)
      .match(/\s([a-zA-Z]+)/)[1]
      .toLowerCase();
  },
  type_clean: (prop) => {
    let allowed = ['string', 'number', 'boolean', 'array'];
    let type = helper.type(prop);
    if (!allowed.includes(type)) return 'string';
    return type;
  },
  path: (words, wordSeparator = '_', pathSeparator = '.') => {
    return words
      .split(nestedIndicator)
      .map((word) => {
        return slugify(word.replace(/[\/\\\-_*+~.()'"!:@\?\s+]/, ' '), {
          replacement: wordSeparator,
          lower: true,
          strict: true,
          remove: /[\/\\*+~.()'"!:@\?]/g,
        }).replace(new RegExp('_array_', 'g'), '[]');
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
  random: (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
  },
  logtime: (end) => {
    strapi.log.info('Execution time (hr): %ds %dms', end[0], end[1] / 1000000);
  },
  // getFieldsFromArray: (properties, dataset, parent = '') => {
  //   let p = flatten(properties, {
  //     delimiter: nestedIndicator,
  //     safe: true,
  //   });

  //   Object.keys(p).forEach((k) => {
  //     let key = parent + nestedIndicator + k.replace(regex, '');
  //     let path = helper.path(key);
  // },

  getFields: (source, dataset) => {
    let keys = [];
    let fields = [];
    let features = [];
    let regex = new RegExp(nestedIndicator + '\\d+', 'g');

    turf.featureEach(source, function (f, i) {
      let props = {};
      let words = [];

      // get everything except arrays
      let p = flatten(f.properties, {
        delimiter: nestedIndicator,
      });
      Object.keys(p).forEach((k) => {
        let key = k.replace(regex, '[]');
        let path = helper.path(k.replace(regex, '_array_'));

        // only add the field to the array if it doesn't already exist
        if (keys.indexOf(path) === -1 && helper.type(p[k]) !== 'null') {
          let field = {
            title: helper.title(path),
            path: path,
            source: key,
            type: helper.type_clean(p[k]),
            dataset: dataset,
          };

          strapi.log.info(`Found new ${field.type} field ${field.path}`);
          keys.push(path);
          fields.push(field);
        }

        // make sure field is not null or empty string
        let store = true;
        store = p[k] !== null;
        if (helper.type(p[k]) === 'string') store = p[k].trim() !== '';

        if (store) {
          // build keywords
          if (helper.type(p[k]) == 'string' && isNaN(p[k])) {
            words.push(helper.path(p[k], ' ').replace(/\d+/g, '').trim());
          }

          // add the property to the new feature using the clean path
          if (path.indexOf('[]') === -1) props[path] = p[k];
        }
      });

      // get arrays
      p = flatten(f.properties, {
        delimiter: nestedIndicator,
        safe: true,
      });
      Object.keys(p).forEach((k) => {
        let key = k;
        let path = helper.path(k);

        // only add the field to the array if it doesn't already exist
        if (keys.indexOf(path) === -1 && helper.type(p[k]) === 'array') {
          let field = {
            title: helper.title(path),
            path: path,
            source: key,
            type: helper.type_clean(p[k]),
            dataset: dataset,
          };

          strapi.log.info(`Found new ${field.type} field ${path}`);
          keys.push(path);
          fields.push(field);
        }

        // add the property to the new feature using the clean path
        props[path] = p[k];
      });

      // extract cooridnates from feature
      let coords = [null, null, null];
      try {
        coords = turf.getCoord(f);
        coords[0] = Math.round(coords[0] * 1e7) / 1e7;
        coords[1] = Math.round(coords[1] * 1e7) / 1e7;
      } catch (err) {
        strapi.log.warn(`Found invalid coordinates`);
      }

      // process our words to make sure we have unique values
      let keywords = _.uniq(words.join(' ').split(' ')).join(' ');

      // push the new feature object
      features.push({
        dataset: dataset,
        properties: props,
        latitude: coords[1],
        longitude: coords[0],
        keywords: keywords,
      });
    });

    return { fields, features };
  },
  // processProperties: (properties, dataset, keys = [], fields = []) => {
  //   let props = {};
  //   let words = [];

  //   Object.keys(p).forEach((k) => {

  //       // if (field.type === 'array') {
  //       //   strapi.log.info(`Processing array field`);
  //       //   let array_value = flatten(p[key], {
  //       //     delimiter: nestedIndicator,
  //       //   });
  //       //   let result = helper.processProperties(
  //       //     array_value,
  //       //     dataset,
  //       //     keys,
  //       //     fields
  //       //   );
  //       //   keys = _.union(keys, result.keys);
  //       //   fields = _.union(fields, result.fields);
  //       //   p[key] = result.props;

  //       //   console.log(`${JSON.stringify(result, null, 2)}`);
  //       // }
  //     }

  //     // make sure field is not null or empty string
  //     let store = true;
  //     store = p[key] !== null;
  //     if (helper.type(p[key]) === 'string') store = p[key].trim() !== '';

  //     if (store) {
  //       // build keywords
  //       if (helper.type(p[key]) == 'string' && isNaN(p[key])) {
  //         words.push(helper.path(p[key], ' '));
  //       }

  //       // add the property to the new feature using the clean path
  //       props[path] = p[key];
  //     }
  //   });

  //   return { keys, fields, props, words };
  // },
};

module.exports = {
  /**
   * Promise to process a record
   *
   * @return {Promise}
   */
  process: async (params) => {
    let start_all = process.hrtime();

    // find the dataset
    const entry = await strapi.query('dataset').findOne(params);

    // only proceed if we found the dataset
    if (entry != null) {
      // // remove existing fields for this dataset
      // strapi.log.info(`Removing existing fields for this dataset`);
      // await strapi.query('dataset-field').delete({
      //   dataset: entry.id,
      //   _limit: 999999999,
      // });

      // // remove existing features for this dataset
      // strapi.log.info(`Removing existing features for this dataset`);
      // await strapi.query('dataset-feature').delete({
      //   dataset: entry.id,
      //   _limit: 999999999,
      // });

      // read file
      // const path = `${strapi.dir}/public${entry.source.url}`;

      let folder = `${strapi.dir}/../dataarc-data/source/dataset/`;
      let datasets = [];
      fs.readdirSync(folder).forEach((file) => {
        if (file !== '.DS_Store') datasets.push(file);
      });

      let dataset = datasets[7];

      strapi.log.info(`Processing ${dataset}`);

      const path = `${strapi.dir}/../dataarc-data/source/dataset/${dataset}`;
      let source;
      // try {
      source = JSON.parse(fs.readFileSync(path, 'utf8'));
      source = turf.featureCollection(source.features);
      // } catch (e) {
      //   throw new Error(
      //     `There was a problem parsing the JSON file in ${entry.name}`
      //   );
      // }

      let start_features = process.hrtime();

      // get the keys and fields
      let { fields, features } = helper.getFields(source);

      // strapi.log.info(`FIELDS`);
      // console.log(`${JSON.stringify(fields, null, 2)}`);
      // strapi.log.info(`KEYS`);
      // console.log(`${JSON.stringify(keys, null, 2)}`);

      // go through all the features, get all the fields
      // let features = [];

      // extract features and process
      // turf.featureEach(source, function (f, i) {
      //   // extract and process properties

      //   let result = helper.processProperties(
      //     f.properties,
      //     entry.id,
      //     keys,
      //     fields
      //   );
      //   keys = _.union(keys, result.keys);
      //   fields = _.union(fields, result.fields);

      //   // extract cooridnates from feature
      //   let coords = [null, null, null];
      //   try {
      //     coords = turf.getCoord(f);
      //     coords[0] = Math.round(coords[0] * 1e7) / 1e7;
      //     coords[1] = Math.round(coords[1] * 1e7) / 1e7;
      //   } catch (err) {
      //     strapi.log.warn(`Found invalid coordinates`);
      //   }

      //   // push the new feature object
      //   features.push({
      //     dataset: entry.id,
      //     properties: result.props,
      //     latitude: coords[1],
      //     longitude: coords[0],
      //     keywords: result.words.join(' '),
      //   });
      // });

      strapi.log.info(`Done processing features`);
      helper.logtime(process.hrtime(start_features));

      // // create new fields
      // strapi.log.info(`Creating ${fields.length} fields`);
      // if (Array.isArray(fields))
      //   await Promise.all(fields.map(strapi.query('dataset-field').create));

      // // create new features
      // strapi.log.info(`Creating ${features.length} features`);
      // if (Array.isArray(features))
      //   await Promise.all(features.map(strapi.query('dataset-feature').create));

      strapi.log.info(`Finished processing ${dataset}`);
      helper.logtime(process.hrtime(start_all));
      let random_record = helper.random(0, features.length - 1);
      strapi.log.info(
        `Processed ${fields.length} fields in ${features.length} features`
      );
      strapi.log.info(`Showing random record ${random_record}:`);
      console.log(`${JSON.stringify(features[random_record], null, 2)}`);
    }

    return entry;
  },
};
