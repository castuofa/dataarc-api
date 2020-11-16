'use strict';

const _ = require('lodash');
const chalk = require('chalk');
const pug = require('pug');

module.exports = {
  // add array of features
  addFeatures: async (features) => {
    return strapi
      .query('feature')
      .model.insertMany(features, { ordered: false });
  },

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
    let features = [];
    _.each(source.features, (source) => {
      let processed = process(entity, source);
      if (processed) {
        let refreshed = refresh(entity, processed);
        if (refreshed) features.push(refreshed);
      }
    });

    // log that we're done processing
    log(
      'debug',
      `${chalk.green(features.length)} processed, ${chalk.red(
        source.features.length - features.length
      )} rejected`,
      start
    );

    // prepart to insert the features
    start = Date.now();
    let insert = await strapi.services['dataset'].addFeatures(features, {
      ordered: false,
    });
    if (insert) {
      log(
        'debug',
        `${chalk.green(insert.length)} inserted, ${chalk.red(
          features.length - insert.length
        )} rejected`,
        start
      );

      // refresh the spatial attributes and feature data
      // strapi.services['dataset'].refreshFeatures(entity);
      // strapi.services['dataset'].refreshFeaturesSpatial(entity);

      // set the process datetime / boolean
      await strapi.services['dataset'].setProcess(entity.id, Date.now());
    }

    return '';
  },

  // refresh feature spatial attributes
  refreshFeaturesSpatial: async (entity) => {
    // // *************************
    // // *** SPATIAL COVERAGES ***
    // // *************************
    // if (feature.location) {
    //   let spatial_coverages = await strapi
    //     .query('spatial-coverage')
    //     .model.find({
    //       geometry: {
    //         $geoIntersects: {
    //           $geometry: feature.location,
    //         },
    //       },
    //     });
    //   console.log('spatial coverages');
    //   if (!_.isEmpty(spatial_coverages)) {
    //     // feature.spatial_coverages = _.map(spatial_coverages, 'id');
    //     // feature.facets['spatial_coverages'] = _.map(spatial_coverages, 'title');
    //   }
    // }

    // // **************************
    // // *** TEMPORAL COVERAGES ***
    // // **************************
    // let begin_type = strapi.services['helper'].getType(feature.begin);
    // let end_type = strapi.services['helper'].getType(feature.end);

    // // if a valid range, set decades, centuries, millennia
    // if (begin_type === 'number' && end_type === 'number') {
    //   let temporal_coverages = await strapi.query('temporal-coverage').find({
    //     begin_lte: feature.end,
    //     end_gte: feature.begin,
    //   });
    //   console.log('temporal coverages');
    //   if (!_.isEmpty(temporal_coverages)) {
    //     // feature.temporal_coverages = _.map(temporal_coverages, 'id');
    //     // feature.facets['temporal_coverages'] = _.map(temporal_coverages, 'title');
    //   }
    // }

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
    log('debug', `Refreshing all features in ${entity.title}`);

    // get all dataset features
    let features = await strapi
      .query('feature')
      .model.find({ dataset: entity.id });

    console.log(features.length);

    // _.each(entity.features, (id) => {
    //   promises.push(strapi.services['feature'].refresh({ id }));
    // });

    // make sure all promises have been settled
    // return Promise.allSettled(promises).then(async (res) => {
    //   strapi.log.debug(`All features refreshed`);
    //   await strapi.services['dataset'].refreshCombinators(entity);
    // });
  },

  // refresh combinators
  refreshCombinators: async (entity) => {
    if (!entity) return;
    if (!entity.combinators) return;
    strapi.log.debug(`Refreshing all combinators in ${entity.title}`);
    let promises = [];

    // clear the combinators and concepts
    await strapi
      .query('feature')
      .model.updateMany(
        { dataset: entity.id },
        { $set: { combinators: [], concepts: [] } }
      );

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

// ************************
// *** HELPER FUNCTIONS ***
// ************************

// simple log function with time calculation
const log = (type, msg, time) => {
  type = type || 'debug';
  if (time) time = ` (${Math.ceil(Date.now() - time)} ms)`;
  strapi.log[type](`${msg}${time}`);
};

// function to extract the fields and properties for a feature
const extract = (target, opts) => {
  opts = opts || {};
  const delimiter = opts.delimiter || ' --> ';
  const maxDepth = opts.maxDepth;
  const prefix = opts.prefix || null;
  const parent = opts.parent || null;
  let fields = [];
  const properties = {};

  const save = (key, field, property) => {
    if (field) fields.push(field);
    if (property) properties[key] = property;
  };

  const step = (object, prev, depth) => {
    depth = depth || 1;
    Object.keys(object).forEach((key) => {
      let value = object[key];
      if (value === undefined || value === null) return;
      let type = strapi.services['helper'].getType(value);
      let isobject = type === 'object' || type === 'array';
      let isarray = opts.safe && type === 'array';
      let newkey = prev ? `${prev}${delimiter}${key}` : key;
      let source = prefix ? `${prefix}${delimiter}${newkey}` : newkey;
      let allowed_types = ['string', 'number', 'boolean', 'array'];
      let allowed = _.indexOf(allowed_types, type) !== -1;

      // validate strings
      if (type === 'string') {
        value = value.trim();

        // check if string is empty or null
        if (value === '') allowed = false;

        // check if its a number
        if (allowed && !isNaN(value)) {
          type = 'number';
          value *= 1;
        }
      }

      // define field
      let field = {
        name: strapi.services['helper'].getName(source),
        source: source,
        type: type,
        parent: parent,
      };

      // if object or array we need further processing
      if (
        isobject &&
        Object.keys(value).length &&
        (!opts.maxDepth || depth < maxDepth)
      ) {
        if (!isarray) {
          return step(value, newkey, depth + 1);
        } else {
          let values = [];
          Object.keys(value).forEach((i) => {
            if (value[i] === undefined || value[i] === null) return;
            let item_type = strapi.services['helper'].getType(value[i]);
            if (item_type === 'object') {
              let result = extract(value[i], {
                ...opts,
                prefix: field.source,
                parent: field.name,
              });
              fields = _.unionBy(result.fields, fields, 'name');
              values.push(result.properties);
            } else values.push(value[i]);
          });
          value = values;
        }
      }

      // only store wanted values for each type
      if (allowed) save(field.name, field, value);
    });
  };
  step(target);

  return { fields, properties };
};

// takes the dataset/source and returns the feature object
const process = (dataset, source) => {
  // make sure source is a valid feature
  try {
    if (source.type.toLowerCase() != 'feature') return;
    if (!source.geometry) return;
    if (!source.properties) return;
  } catch (e) {
    log('error', `This feature cannot be processed`);
    return;
  }

  // define our variables
  let feature = {};

  // extract our properties and fields
  let { properties, fields } = extract(source.properties, {
    safe: true,
  });

  // set the initial attributes
  feature.dataset = dataset.id;
  feature.source = source;
  feature.properties = properties;
  feature.fields = fields;

  // ****************
  // *** LOCATION ***
  // ****************
  // define our location schema to validate geometry
  let schema = strapi.services['helper'].getSchema('location');
  let location_valid = strapi.services['helper'].checkSource(
    schema,
    source.geometry
  );
  let loc = JSON.parse(JSON.stringify(source.geometry));

  // if valid schema, do more checks
  if (location_valid) {
    // validate the coordinate range
    location_valid = loc.coordinates[0] >= -180 || loc.coordinates[0] <= 180;
    location_valid = loc.coordinates[1] >= -90 || loc.coordinates[1] <= 90;
  }

  // make sure its still valid then set
  if (location_valid) {
    // limit to 7 digit precision
    loc.coordinates[0] = Math.round(loc.coordinates[0] * 1e7) / 1e7;
    loc.coordinates[1] = Math.round(loc.coordinates[1] * 1e7) / 1e7;

    // remove altitude
    if (loc.coordinates.length > 2) loc.coordinates.pop();

    // set the location
    feature.location = loc;

    // set the radius if it exists
    if (feature.properties.radius) feature.radius = feature.properties.radius;
  }

  return feature;
};

// take the dataset/feature and refresh feature attributes
const refresh = (dataset, feature) => {
  if (!dataset || !feature) return;

  // make sure feature.properties is set
  if (_.isEmpty(feature.properties)) {
    log('error', `Feature properties are not defined, cannot refresh`);
    return feature;
  }

  // define facets
  feature.facets = {};

  // get the dataset fields
  const fields = dataset.fields;

  // ***********************
  // *** CATEGORY FACETS ***
  // ***********************
  if (!_.isEmpty(dataset.category)) {
    feature.facets['category'] = {
      id: dataset.category.id,
      name: dataset.category.name,
      title: dataset.category.title,
      color: dataset.category.color,
    };
  }

  // **********************
  // *** DATASET FACETS ***
  // **********************
  if (!_.isEmpty(dataset.id)) {
    feature.facets['dataset'] = {
      id: dataset.id,
      name: dataset.name,
      title: dataset.title,
    };
  }

  // ****************
  // *** KEYWORDS ***
  // ****************
  // build the keywords from string of the properties
  let words = JSON.stringify(feature.properties);

  // loop through our field names and remove them from the string
  _.each(feature.fields, (field) => {
    words = _.replace(words, new RegExp(field.name, 'g'), '!!');
  });

  // clean the keywords
  words = strapi.services['helper'].getKeyword(words);

  // get unique words only to reduce the stored size
  words = _.join(_.uniq(_.words(words)), ' ');

  // set the keywords
  if (!_.isEmpty(words.trim())) feature.keywords = words;

  // ***********************
  // *** BEGIN/END DATES ***
  // ***********************
  let valid_begin = false;
  let valid_end = false;

  // set the begin date
  let begin_field = _.find(fields, { type: 'begin' });
  if (begin_field) {
    let begin_value = feature.properties[begin_field.name];
    if (strapi.services['helper'].getType(begin_value) === 'number') {
      valid_begin = true;
      feature.begin = begin_value;
    }
  }

  // set the end date
  let end_field = _.find(fields, { type: 'end' });
  if (end_field) {
    let end_value = feature.properties[end_field.name];
    if (strapi.services['helper'].getType(end_value) === 'number') {
      valid_end = true;
      feature.end = end_value;
    }
  }

  // ***********************
  // *** TEMPORAL FACETS ***
  // ***********************
  // if valid set decades, centuries, millennia
  if (valid_begin && valid_end) {
    feature.facets['decades'] = _.range(
      Math.floor(feature.begin / 10) * 10,
      Math.ceil(feature.end / 10) * 10,
      10
    );
    feature.facets['centuries'] = _.range(
      Math.floor(feature.begin / 100) * 100,
      Math.ceil(feature.end / 100) * 100,
      100
    );
    feature.facets['millennia'] = _.range(
      Math.floor(feature.begin / 1000) * 1000,
      Math.ceil(feature.end / 1000) * 1000,
      1000
    );
  }

  // *****************
  // *** URL FIELD ***
  // *****************
  // set the url
  let url_field = _.find(fields, { type: 'url' });
  if (url_field) {
    feature.url = feature.properties[url_field.name];
  }

  // ***************
  // *** LAYOUTS ***
  // ***************

  // set the link using the url
  if (dataset.link_layout && feature.url) {
    try {
      feature.link = pug.render(
        `a(href='${feature.url}'). \n  ` + dataset.link_layout,
        feature.properties
      );
    } catch (err) {
      feature.link = null;
    }
  }

  // render title
  if (dataset.title_layout) {
    try {
      feature.title = pug
        .render('span ' + dataset.title_layout, feature.properties)
        .replace('<span>', '')
        .replace('</span>', '');
    } catch (err) {
      feature.title = null;
    }
  }

  // render summary
  if (dataset.summary_layout) {
    try {
      feature.summary = pug.render(dataset.summary_layout, feature.properties);
    } catch (err) {
      feature.summary = null;
    }
  }

  // render details
  if (dataset.details_layout) {
    try {
      feature.details = pug.render(dataset.details_layout, feature.properties);
    } catch (err) {
      feature.details = null;
    }
  }

  return feature;
};
