'use strict';

const _ = require('lodash');
const chalk = require('chalk');

module.exports = {
  // remove all related features
  removeFeatures: async (id) => {
    return strapi.query('feature').model.deleteMany({ dataset: id });
  },

  // remove all related fields
  removeFields: async (id) => {
    return strapi.query('dataset-field').model.deleteMany({ dataset: id });
  },

  // remove all related combinators
  removeCombinators: async (id) => {
    return strapi.query('combinator').model.deleteMany({ dataset: id });
  },

  // set processed_at
  setProcess: async (id, value) => {
    let processing = value ? false : true;
    return strapi
      .query('dataset')
      .update({ id: id }, { processed_at: value, processing: processing });
  },

  // set fields as missing and mark for review
  setFieldsMissing: async (id) => {
    return strapi
      .query('dataset-field')
      .update({ dataset: id }, { missing: true, review: true });
  },

  // process dataset
  process: async (dataset) => {
    let start = Date.now();
    let source = await strapi.services['helper'].loadSource(dataset.source);
    let schema = await strapi.services['helper'].getSchema('geojson');
    let valid = await strapi.services['helper'].checkSource(schema, source);
    if (!valid) throw new Error('Invalid data source');

    // clear processed_at field
    strapi.services['dataset'].setProcess(dataset.id, null);

    // set existing fields to missing and mark for review
    strapi.services['dataset'].setFieldsMissing(dataset.id);

    // remove existing features
    await strapi.services['dataset'].removeFeatures(dataset.id);

    // add the features
    let promises = [];
    _.each(source.features, (feature) => {
      promises.push(strapi.services['feature'].process(dataset, feature));
    });

    // make sure all promises have been settled
    Promise.allSettled(promises).then((res) => {
      let delta = Math.ceil(Date.now() - start);
      let results = _.groupBy(res, 'status');
      let fulfilled = results.fulfilled ? results.fulfilled.length : 0;
      let rejected = results.rejected ? results.rejected.length : 0;
      strapi.log.debug(
        `${chalk.green(fulfilled)} PROCESSED, ${chalk.red(
          rejected
        )} REJECTED (${delta} ms)`
      );
      let features = _.map(results.fulfilled, 'value');
      strapi
        .query('feature')
        .model.insertMany(features)
        .then((result) => {
          let delta = Math.ceil(Date.now() - start);
          strapi.log.debug(`Features inserted (${delta} ms)`);

          // refresh the spatial attributes and feature data
          strapi.services['dataset'].refreshFeatures(dataset.id);
          strapi.services['dataset'].refreshFeaturesSpatial(dataset.id);

          // set the process datetime / boolean
          strapi.services['dataset'].setProcess(dataset.id, Date.now());
        });
    });

    return '';
  },

  // refresh feature spatial attributes
  refreshFeaturesSpatial: async (id) => {
    strapi.log.debug(`Refreshing features spatial attributes`);
    let promises = [];

    const features = await strapi
      .query('feature')
      .find({ dataset: id, _limit: 999999999 });

    let data_path = `${strapi.dir}/data`;
    let spatial_config = require(`${data_path}/spatial.config.json`);

    if (spatial_config) {
      const shapefile = require('shapefile');
      const whichPolygon = require('which-polygon');

      // loop through each shapefile
      _.each(spatial_config, async (spatial) => {
        promises.push(
          shapefile
            .read(`${data_path}/${spatial.file}`)
            .then((geojson) => {
              let query = whichPolygon(geojson);
              let update = {};

              // loop through our features to find matching polygon
              _.each(features, (feature) => {
                if (feature.location) {
                  let found = query([
                    feature.location.coordinates[0],
                    feature.location.coordinates[1],
                  ]);
                  if (found) {
                    // check for the fields
                    _.each(spatial.fields, (field) => {
                      if (found[field.source])
                        update[`facets.spatial.${field.target}`] =
                          found[field.source];
                    });

                    // update the feature
                    promises.push(
                      strapi.query('feature').update({ id: feature.id }, update)
                    );
                  }
                }
              });
            })
            .catch((e) => {
              console.log(e);
            })
        );
      });
    }

    // make sure all promises have been settled
    Promise.allSettled(promises).then((res) => {
      strapi.log.debug(`Feature spatial refresh complete`);
    });
  },

  // refresh features
  refreshFeatures: async (id) => {
    strapi.log.debug(`Refreshing all features`);
    let promises = [];
    let map_points = {};

    let features = await strapi
      .query('feature')
      .find({ dataset: id, _limit: 999999999 });

    _.each(features, (feature) => {
      if (feature.location) {
        map_points[feature.id] = {
          id: feature.id,
          lon: feature.location.coordinates[0],
          lat: feature.location.coordinates[1],
          color: feature.facets.category.color,
        };
      }
      promises.push(strapi.services['feature'].refresh(feature));
    });

    // make sure all promises have been settled
    return Promise.allSettled(promises).then((res) => {
      strapi.log.debug(`All features refreshed`);

      // store a simple array of id, lat, lng for quick map building
      strapi
        .query('dataset')
        .update({ id }, { map_points: _.values(map_points) });
    });
  },

  // extract all fields from the features
  extractFields: async (dataset) => {
    strapi.log.debug(`Extracting fields`);
    let promises = [];
    const features = await strapi
      .query('feature')
      .find({ dataset: dataset.id, _limit: 999999999 });

    const existing = await strapi
      .query('dataset-field')
      .find({ dataset: dataset.id, _limit: 999999 });

    // get a list of unique fields from all the features
    let fields = {};
    _.each(features, (feature) => {
      _.each(feature.fields, (field) => {
        if (!fields[field.name]) {
          field.review = true;
          field.missing = false;
          field.dataset = dataset.id;
          let exists = _.find(existing, ['name', field.name]);
          if (exists) {
            delete field.type;
            delete field.title;
            promises.push(
              strapi
                .query('dataset-field')
                .update({ id: exists.id }, field)
                .catch((e) => {})
            );
          } else {
            field.title = strapi.services['helper'].getTitle(field.name);
            promises.push(
              strapi
                .query('dataset-field')
                .create(field)
                .catch((e) => {})
            );
          }
          fields[field.name] = field;
        }
      });
    });

    // make sure all promises have been settled
    Promise.allSettled(promises).then((res) => {
      // update the feature
      // console.log(res);
      strapi.log.debug(`Fields extracted`);
    });
  },
};
