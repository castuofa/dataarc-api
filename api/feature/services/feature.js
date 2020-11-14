'use strict';

const _ = require('lodash');
const pug = require('pug');

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

module.exports = {
  process: async (dataset, source) => {
    // make sure source is a valid feature
    try {
      if (source.type.toLowerCase() != 'feature') return;
      if (!source.geometry) return;
      if (!source.properties) return;
    } catch (e) {
      throw new Error(`This feature cannot be processed`);
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
    feature.facets = {};

    // ****************
    // *** CATEGORY ***
    // ****************
    if (!_.isEmpty(dataset.category)) {
      feature.facets['category'] = {
        id: dataset.category.id,
        name: dataset.category.name,
        title: dataset.category.title,
        color: dataset.category.color,
      };
    }

    // ***************
    // *** DATASET ***
    // ***************
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

    // ***************
    // *** SPATIAL ***
    // ***************
    // define our location schema to validate geometry
    let schema = await strapi.services['helper'].getSchema('location');
    let location_valid = await strapi.services['helper'].checkSource(
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
  },

  refresh: async (params) => {
    // find the entity
    const entity = await strapi.query('feature').findOne(params);

    // only proceed if we found an entity
    if (entity != null) {
      // make sure feature.properties is set
      if (_.isEmpty(entity.properties))
        throw new Error(`Feature properties are not defined, cannot refresh`);

      // get the dataset
      const dataset = await strapi.query('dataset').findOne({ id: entity.id });

      // get the dataset fields
      const fields = dataset.fields;
      // const fields = await strapi
      //   .query('dataset-field')
      //   .find({ dataset: dataset.id });

      // *************************
      // *** SPATIAL COVERAGES ***
      // *************************
      if (entity.location) {
        await strapi
          .query('spatial-coverage')
          .model.find({
            geometry: {
              $geoIntersects: {
                $geometry: entity.location,
              },
            },
          })
          .then((results) => {
            if (!_.isEmpty(results)) {
              entity.spatial_coverages = _.map(results, 'id');
              entity.facets['spatial_coverages'] = _.map(results, 'title');
            }
          })
          .catch((e) => {
            strapi.log.error(e.message);
          });
      }

      // **************************
      // *** TEMPORAL COVERAGES ***
      // **************************
      let begin_type = strapi.services['helper'].getType(entity.begin);
      let end_type = strapi.services['helper'].getType(entity.end);

      // if a valid range, set decades, centuries, millennia
      if (begin_type === 'number' && end_type === 'number') {
        await strapi
          .query('temporal-coverage')
          .find({ begin_lte: entity.end, end_gte: entity.begin })
          .then((results) => {
            if (!_.isEmpty(results)) {
              entity.temporal_coverages = _.map(results, 'id');
              entity.facets['temporal_coverages'] = _.map(results, 'title');
            }
          })
          .catch((e) => {
            strapi.log.error(e.message);
          });
      }

      // ? temporal_keywords

      // ****************
      // *** TEMPORAL ***
      // ****************
      let valid_begin = false;
      let valid_end = false;

      // set the begin date
      let begin_field = _.find(fields, {
        type: 'begin',
      });
      if (begin_field) {
        let begin_value = entity.properties[begin_field.name];
        if (strapi.services['helper'].getType(begin_value) === 'number') {
          valid_begin = true;
          entity.begin = begin_value;
        }
      }

      // set the end date
      let end_field = _.find(fields, {
        type: 'end',
      });
      if (end_field) {
        let end_value = entity.properties[end_field.name];
        if (strapi.services['helper'].getType(end_value) === 'number') {
          valid_end = true;
          entity.end = end_value;
        }
      }

      // if valid set decades, centuries, millennia
      if (valid_begin && valid_end) {
        entity.facets['decades'] = _.range(
          Math.floor(entity.begin / 10) * 10,
          Math.ceil(entity.end / 10) * 10,
          10
        );
        entity.facets['centuries'] = _.range(
          Math.floor(entity.begin / 100) * 100,
          Math.ceil(entity.end / 100) * 100,
          100
        );
        entity.facets['millennia'] = _.range(
          Math.floor(entity.begin / 1000) * 1000,
          Math.ceil(entity.end / 1000) * 1000,
          1000
        );
      }

      // ******************************
      // *** COMBINATORS & CONCEPTS ***
      // ******************************

      // combinators, concepts

      // *****************
      // *** URL FIELD ***
      // *****************
      // set the url
      let url_field = _.find(fields, {
        type: 'url',
      });
      if (url_field) {
        entity.url = entity.properties[url_field.name];
      }

      // ***************
      // *** LAYOUTS ***
      // ***************

      // set the link using the url
      if (dataset.link_layout && entity.url) {
        try {
          entity.link = pug.render(
            `a(href='${entity.url}'). \n  ` + dataset.link_layout,
            entity.properties
          );
        } catch (err) {
          entity.link = null;
        }
      }

      // render title
      if (dataset.title_layout) {
        try {
          entity.title = pug
            .render('span ' + dataset.title_layout, entity.properties)
            .replace('<span>', '')
            .replace('</span>', '');
        } catch (err) {
          entity.title = null;
        }
      }

      // render summary
      if (dataset.summary_layout) {
        try {
          entity.summary = pug.render(
            dataset.summary_layout,
            entity.properties
          );
        } catch (err) {
          entity.summary = null;
        }
      }

      // render details
      if (dataset.details_layout) {
        try {
          entity.details = pug.render(
            dataset.details_layout,
            entity.properties
          );
        } catch (err) {
          entity.details = null;
        }
      }

      // **************
      // *** FINISH ***
      // **************
      // make sure all promises have been settled
      return await strapi.query('feature').update({ id: entity.id }, entity);
    }
  },
};
