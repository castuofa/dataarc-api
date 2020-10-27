'use strict';

const _ = require('lodash');
const pug = require('pug');

module.exports = {
  // before processing
  pre_process: async (dataset) => {
    // clear processed_at field
    strapi.query('dataset').update({ id: dataset }, { processed_at: null });

    // remove existing features
    strapi.services['dataset'].remove_features(dataset);

    // set existing fields to missing and mark for review
    strapi
      .query('dataset-field')
      .update({ dataset: dataset }, { missing: true, review: true });
  },

  // after processing
  post_process: async (dataset) => {
    // set processed_at
    strapi
      .query('dataset')
      .update({ id: dataset }, { processed_at: Date.now() });
  },

  // remove all related features
  remove_features: async (dataset) => {
    return strapi.query('feature').model.deleteMany({ dataset: dataset });
  },

  // remove all related fields
  remove_fields: async (dataset) => {
    return strapi.query('dataset-field').model.deleteMany({ dataset: dataset });
  },

  // remove all related combinators
  remove_combinators: async (dataset) => {
    return strapi.query('combinator').model.deleteMany({ dataset: dataset });
  },

  // process: async (params) => {
  //   // find the entry
  //   const entry = await strapi.query('dataset').findOne(params);
  //   if (entry != null) {
  //     // set processed_at
  //     strapi.query('dataset').update({ id: entry.id }, { processed_at: null });

  //     // read source file
  //     let source;
  //     // try {
  //     source = strapi.services['helper'].load_json(
  //       `${strapi.dir}/public${entry.source.url}`
  //     );
  //     // pull out valid geojson features
  //     source = turf.featureCollection(source.features);
  //     // } catch (err) {
  //     //   throw new Error(
  //     //     `There was a problem parsing the JSON file in ${entry.name}`
  //     //   );
  //     // }

  //     return;

  // main function called to extract the properties
  // let extract_properties = (
  //   input,
  //   keys,
  //   fields,
  //   properties = {},
  //   words = [],
  //   parent = ''
  // ) => {
  //   // flatten properties
  //   let props = flatten(input, {
  //     delimiter: nestedIndicator,
  //     safe: true,
  //   });

  //   // loop through the properties
  //   _.forOwn(props, function (value, key) {
  //     let source = (parent ? parent + nestedIndicator : '') + key;
  //     let type = strapi.services['helper'].get_type(value);
  //     let path = strapi.services['helper'].get_name(source);
  //     let title = strapi.services['helper'].get_title(entry.name + ' ' + path);
  //     let name = strapi.services['helper'].get_name(title);
  //     let store_property = false;

  //     // process based on the type
  //     switch (type) {
  //       case 'string':
  //         value = value.trim();
  //         if (value === '') break;
  //         store_property = true;
  //         break;
  //       case 'number':
  //         store_property = true;
  //         break;
  //       case 'boolean':
  //         store_property = true;
  //         break;
  //       case 'array':
  //         if (_.isEmpty(value)) break;
  //         let values = [];
  //         for (var i = value.length; i--; ) {
  //           let item_type = strapi.services['helper'].get_type(value[i]);
  //           if (item_type === 'object') {
  //             let p = {};
  //             extract_properties(value[i], keys, fields, p, words, path);
  //             values.push(p);
  //           } else {
  //             strapi.log.warn(
  //               `Array item is not object ${JSON.stringify(value[i])}`
  //             );
  //             values.push(value[i]);
  //           }
  //         }
  //         value = values;
  //         store_property = true;
  //         break;
  //       default:
  //         // ignore null, undefined, and other types
  //         store_property = false;
  //         break;
  //     }

  //     // process the property
  //     if (store_property) {
  //       let field = {
  //         name: name,
  //         title: title,
  //         parent: parent === '' ? null : parent,
  //         path: path,
  //         source: source,
  //         type: type,
  //         state: 'pending',
  //         state_msg: 'New field, pending verification',
  //         state_at: Date.now(),
  //         dataset: entry.id,
  //       };

  //       // build keywords
  //       if (type === 'string' && isNaN(value)) {
  //         words.push(strapi.services['helper'].get_keyword(value));
  //       }

  //       // add to keys/fields if its new
  //       if (keys.indexOf(path) === -1) {
  //         keys.push(path);
  //         fields.push(field);
  //       }

  //       // add the property to the new feature using the clean path
  //       properties[path] = value;
  //     }
  //   });
  //   return { keys, fields, properties, words };
  // };

  //   let keys = [];
  //   let fields = [];
  //   let features = [];

  //   // loop through the source features to build our fields and new features
  //   _.each(source.features, function (f) {
  //     let properties = {};
  //     let words = [];

  //     // extract properties
  //     extract_properties(f.properties, keys, fields, properties, words);

  //     // extract cooridnates from feature
  //     let coords = [null, null, null];
  //     try {
  //       coords = turf.getCoord(f);
  //       coords[0] = Math.round(coords[0] * 1e7) / 1e7;
  //       coords[1] = Math.round(coords[1] * 1e7) / 1e7;
  //     } catch (err) {
  //       strapi.log.warn(`Found invalid coordinates`);
  //     }

  //     // process words to make sure we have unique values
  //     let keywords = _.uniq(words.join(' ').split(' ')).join(' ');

  //     // push the new feature object
  //     features.push({
  //       dataset: entry.id,
  //       properties: properties,
  //       latitude: coords[1],
  //       longitude: coords[0],
  //       keywords: keywords,
  //     });
  //   });

  //   // remove existing fields and features for this dataset then create new
  //   Promise.allSettled([
  //     strapi.query('dataset-field').model.deleteMany({ dataset: entry.id }),
  //     strapi.query('feature').model.deleteMany({ dataset: entry.id }),
  //   ]).then(
  //     Promise.allSettled([
  //       strapi.query('dataset-field').model.insertMany(fields),
  //       strapi.query('feature').model.insertMany(features),
  //     ]).then((results) => {
  //       // check to make sure all promises were fulfilled
  //       _.each(results, (result) => {
  //         if (result.status != 'fulfilled') {
  //           // have to set the state here instaed of throw an error
  //           // since these contine to run after the function returns
  //           let event = {
  //             type: 'error',
  //             action: 'process',
  //             item: entry.id,
  //             details: 'Something went wrong, please try again',
  //           };
  //           strapi.services['event'].log(event);
  //           return entry;
  //         }
  //       });

  //       // set processed
  //       strapi
  //         .query('dataset')
  //         .update({ id: entry.id }, { processed_at: Date.now() });

  //       // show information about processed dataset
  //       strapi.log.info(
  //         `Processed ${fields.length} fields in ${features.length} features`
  //       );
  //     })
  //   );
  // }

  // return entry;
  // },

  refresh: async (params) => {
    // find the entry
    const entry = await strapi.query('dataset').findOne(params);
    if (entry != null) {
      const category = await strapi
        .query('category')
        .findOne({ id: entry.category });

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
            feature.title = pug
              .render(
                'span ' + feature.dataset.title_layout,
                feature.properties
              )
              .replace('<span>', '')
              .replace('</span>', '');
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

          // set facets
          feature.facets = {};
          feature.facets['dataset'] = entry.id;
          feature.facets['category'] = category.id;
          feature.facets['combinators'] = [];
          feature.facets['concepts'] = [];
          if (
            strapi.helper.get_type(feature.start_date) === 'number' &&
            strapi.helper.get_type(feature.end_date) === 'number'
          ) {
            feature.facets['decades'] = _.range(
              Math.floor(feature.start_date / 10) * 10,
              Math.ceil(feature.end_date / 10) * 10,
              10
            );
            feature.facets['centuries'] = _.range(
              Math.floor(feature.start_date / 100) * 100,
              Math.ceil(feature.end_date / 100) * 100,
              100
            );
            feature.facets['millenia'] = _.range(
              Math.floor(feature.start_date / 1000) * 1000,
              Math.ceil(feature.end_date / 1000) * 1000,
              1000
            );
          }
          let tc = strapi.query('temporal-coverage').find({
            start_date_lte: feature.start_date,
            end_date_gte: feature.end_date,
          });
          feature.facets['temporal-coverages'] = _.map(tc, 'id');

          feature.facets['region'] = '';
          feature.facets['country'] = '';

          // update the feature
          strapi.query('feature').update({ id: feature.id }, feature);
        });
      }
    }

    return entry;
  },
};
