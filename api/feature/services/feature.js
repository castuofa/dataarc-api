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

    // ****************
    // *** CATEGORY ***
    // ****************
    // set the cateogry
    if (!_.isEmpty(dataset.category)) feature.category = dataset.category;

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
    const location_schema = {
      type: 'object',
      required: ['type', 'coordinates'],
      properties: {
        type: {
          type: 'string',
          enum: ['Point'],
        },
        coordinates: {
          type: 'array',
          minItems: 2,
          maxItems: 3,
          items: {
            type: 'number',
            minimum: -180,
            maximum: 180,
            required: true,
          },
        },
      },
    };
    let loc = JSON.parse(JSON.stringify(source.geometry));

    // validate against the schema
    const validate = require('jsonschema').validate;
    let location_valid = validate(loc, location_schema, {
      required: true,
    }).valid;

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
      let begin_value = feature.properties[begin_field.name];
      if (strapi.services['helper'].getType(begin_value) === 'number') {
        valid_begin = true;
        feature.begin = begin_value;
      }
    }

    // set the end date
    let end_field = _.find(fields, {
      type: 'end',
    });
    if (end_field) {
      let end_value = feature.properties[end_field.name];
      if (strapi.services['helper'].getType(end_value) === 'number') {
        valid_end = true;
        feature.end = end_value;
      }
    }

    // if valid set decades, centuries, millennia
    if (valid_begin && valid_end) {
      feature.decades = _.range(
        Math.floor(feature.begin / 10) * 10,
        Math.ceil(feature.end / 10) * 10,
        10
      );
      feature.centuries = _.range(
        Math.floor(feature.begin / 100) * 100,
        Math.ceil(feature.end / 100) * 100,
        100
      );
      feature.millennia = _.range(
        Math.floor(feature.begin / 1000) * 1000,
        Math.ceil(feature.end / 1000) * 1000,
        1000
      );
    }

    return feature;
  },

  refresh: async (feature) => {
    let promises = [];

    // make sure feature.properties is set
    if (_.isEmpty(feature.properties))
      throw new Error(`Feature properties are not defined, cannot refresh`);

    // get the dataset fields
    const fields = await strapi
      .query('dataset-field')
      .find({ dataset: feature.dataset.id });

    // *************************
    // *** SPATIAL COVERAGES ***
    // *************************
    if (feature.location) {
      promises.push(
        strapi
          .query('spatial-coverage')
          .model.find({
            geometry: {
              $geoIntersects: {
                $geometry: feature.location,
              },
            },
          })
          .then((results) => {
            feature.spatial_coverages = _.map(results, 'id');
          })
      );
    }

    // **************************
    // *** TEMPORAL COVERAGES ***
    // **************************
    let begin_type = strapi.services['helper'].getType(feature.begin);
    let end_type = strapi.services['helper'].getType(feature.end);

    // if a valid range, set decades, centuries, millennia
    if (begin_type === 'number' && end_type === 'number') {
      promises.push(
        strapi
          .query('temporal-coverage')
          .find({ begin_lte: feature.end, end_gte: feature.begin })
          .then((results) => {
            feature.temporal_coverages = _.map(results, 'id');
          })
      );
    }

    // ? temporal_keywords

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
      feature.url = feature.properties[url_field.name];
    }

    // ***************
    // *** LAYOUTS ***
    // ***************

    // set the link using the url
    if (feature.dataset.link_layout && feature.url) {
      try {
        feature.link = pug.render(
          `a(href='${feature.url}'). \n  ` + feature.dataset.link_layout,
          feature.properties
        );
      } catch (err) {
        feature.link = null;
      }
    }

    // render title
    if (feature.dataset.title_layout) {
      try {
        feature.title = pug
          .render('span ' + feature.dataset.title_layout, feature.properties)
          .replace('<span>', '')
          .replace('</span>', '');
      } catch (err) {
        feature.title = null;
      }
    }

    // render summary
    if (feature.dataset.summary_layout) {
      try {
        feature.summary = pug.render(
          feature.dataset.summary_layout,
          feature.properties
        );
      } catch (err) {
        feature.summary = null;
      }
    }

    // render details
    if (feature.dataset.details_layout) {
      try {
        feature.details = pug.render(
          feature.dataset.details_layout,
          feature.properties
        );
      } catch (err) {
        feature.details = null;
      }
    }

    // **************
    // *** FINISH ***
    // **************
    // make sure all promises have been settled
    await Promise.allSettled(promises).then((res) => {
      return strapi.query('feature').update({ id: feature.id }, feature);
    });
  },
};
