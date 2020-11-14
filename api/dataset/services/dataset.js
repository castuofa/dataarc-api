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
  process: async (entity) => {
    let start = Date.now();
    let source = await strapi.services['helper'].loadSource(entity.source);
    let schema = await strapi.services['helper'].getSchema('geojson');
    let valid = await strapi.services['helper'].checkSource(schema, source);
    if (!valid) throw new Error('Invalid data source');

    // clear processed_at field
    await strapi.services['dataset'].setProcess(entity.id, null);

    // set existing fields to missing and mark for review
    await strapi.services['dataset'].setFieldsMissing(entity.id);

    // remove existing features
    await strapi.services['dataset'].removeFeatures(entity.id);

    // add the features
    let promises = [];
    _.each(source.features, (feature) => {
      promises.push(strapi.services['feature'].process(entity, feature));
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
          strapi.services['dataset'].refreshFeatures(entity);
          // strapi.services['dataset'].refreshFeaturesSpatial(entity);

          // set the process datetime / boolean
          strapi.services['dataset'].setProcess(entity.id, Date.now());
        });
    });

    return '';
  },

  // refresh feature spatial attributes
  refreshFeaturesSpatial: async (entity) => {
    strapi.log.debug(`Refreshing features spatial attributes`);
    let promises = [];

    const features = await strapi
      .query('feature')
      .find({ dataset: entity.id, _limit: 999999999 });

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
  refreshFeatures: async (entity) => {
    strapi.log.debug(`Refreshing all features in ${entity.title}`);
    let promises = [];

    _.each(entity.features, (id) => {
      promises.push(strapi.services['feature'].refresh({ id }));
    });

    // make sure all promises have been settled
    return Promise.allSettled(promises).then(async (res) => {
      strapi.log.debug(`All features refreshed`);
      await strapi.services['dataset'].refreshCombinators(entity);
    });
  },

  // refresh combinators
  refreshCombinators: async (entity) => {
    console.log(entity.name);
    if (!entity) return;
    if (!entity.combinators) return;
    strapi.log.debug(`Refreshing all combinators in ${entity.title}`);
    let promises = [];

    // clear the combinators and concepts
    await strapi
      .query('feature')
      .update({ dataset: entity.id }, { combinators: null, concepts: null });

    // process all combinators
    _.each(entity.combinators, (id) => {
      promises.push(strapi.services['combinator'].results({ id }));
    });

    // make sure all promises have been settled
    return Promise.allSettled(promises).then((res) => {
      strapi.log.debug(`All combinators refreshed`);
    });
  },

  // extract all fields from the features
  extractFields: async (entity) => {
    strapi.log.debug(`Extracting fields`);
    let promises = [];
    const features = await strapi
      .query('feature')
      .find({ dataset: entity.id, _limit: 999999999 });

    const existing = await strapi
      .query('dataset-field')
      .find({ dataset: entity.id, _limit: 999999 });

    // get a list of unique fields from all the features
    let fields = {};
    _.each(features, (feature) => {
      _.each(feature.fields, (field) => {
        if (!fields[field.name]) {
          field.review = true;
          field.missing = false;
          field.dataset = entity.id;
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
