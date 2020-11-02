'use strict';

const _ = require('lodash');
const pug = require('pug');

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
  setProcessedAt: async (id, value) => {
    strapi.query('dataset').update({ id: id }, { processed_at: value });
  },

  // set fields as missing and mark for review
  setFieldsMissing: async (id) => {
    strapi
      .query('dataset-field')
      .update({ dataset: id }, { missing: true, review: true });
  },

  // refresh feature spatial attributes
  refreshFeaturesSpatial: async (id) => {
    strapi.log.debug(`Refreshing features spatial attributes`);
    let promises = [];

    const features = await strapi
      .query('feature')
      .find({ dataset: id, _limit: 999999999 });

    // continent, region_un, subregion, region_wb, country, state/province
    const shapefile = require('shapefile');
    const whichPolygon = require('which-polygon');

    let data_path = `${strapi.dir}/data`;
    let spatial_config = require(`${data_path}/spatial.config.json`);

    if (spatial_config) {
      _.each(spatial_config, async (spatial) => {
        promises.push(
          shapefile
            .read(`${data_path}/${spatial.file}`)
            .then((geojson) => {
              let query = whichPolygon(geojson);
              let update = {};

              // loop through our features to find matching polygon
              _.each(features, (feature) => {
                let found = query([
                  feature.location.coordinates[0],
                  feature.location.coordinates[1],
                ]);
                if (found) {
                  // check for the fields
                  _.each(spatial.fields, (field) => {
                    if (found[field.source])
                      update[field.target] = found[field.source];
                  });

                  // update the feature
                  promises.push(
                    strapi.query('feature').update({ id: feature.id }, update)
                  );
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
      // update the feature
      console.log(res);
      strapi.log.debug(`Feature spatial refresh complete`);
    });
  },

  // refresh features
  refreshFeatures: async (id) => {
    strapi.log.debug(`Refreshing features`);
    let promises = [];

    strapi
      .query('feature')
      .find({ dataset: id, _limit: 999999999 })
      .then((features) => {
        _.each(features, (feature) => {
          promises.push(strapi.services['feature'].refresh(feature));
        });
      });

    // make sure all promises have been settled
    Promise.allSettled(promises).then((res) => {
      // update the feature
      strapi.log.debug(`Feature refresh complete`);
    });
  },

  // extract all fields from the features
  extractFields: async (dataset) => {
    strapi.log.debug(`Extracting fields`);
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
            strapi
              .query('dataset-field')
              .update({ id: exists.id }, field)
              .catch((e) => {});
          } else {
            field.title = strapi.services['helper'].getTitle(field.name);
            strapi
              .query('dataset-field')
              .create(field)
              .catch((e) => {});
          }
          fields[field.name] = field;
        }
      });
    });
  },
};
