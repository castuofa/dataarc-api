'use strict';

const _ = require('lodash');

module.exports = {
  markReviewByField: async (dataset_field) => {
    let entities = await strapi
      .query('combinator-query')
      .find({ dataset_field });
    if (entities.length > 0) {
      strapi
        .query('combinator-query')
        .update({ dataset_field }, { review: true })
        .catch((e) => {
          strapi.log.error(`Unable to update combinator-query: ${e.message}`);
        });
    }
  },

  getObject: async (query) => {
    // get the field object
    let dataset_field = await strapi
      .query('dataset-field')
      .findOne({ id: query.dataset_field });

    // set field name
    let field = query.field;

    // if field is within an array prepend array name to field name
    if (dataset_field.parent) field = `${dataset_field.parent}.${field}`;

    // prepend properties
    field = `properties.${field}`;

    // get the primitive of the value
    let value = strapi.services['helper'].parsePrimitive(query.value);

    // get the type of value
    let type = strapi.services['helper'].getType(value);

    // define our allowed arrays
    let allowed_types = ['string', 'number', 'boolean', 'array'];
    let allowed_arrays = ['in', 'not_in'];

    // don't allowed if not an expected type
    let allowed = _.indexOf(allowed_types, type) !== -1;

    // don't allowed empty strings
    if (type === 'string') allowed = value.trim() !== '';

    // only allowed arrays for in, not_in query
    if (type === 'array')
      allowed = _.indexOf(allowed_arrays, query.operator) !== -1;

    // console.log(
    //   `${field}: [${query.operator}] ${value} (${type}) -- ${
    //     allowed ? 'keep' : 'reject'
    //   }`
    // );

    // only continue if the query is allowed
    if (!allowed) return;

    // add the query that matches the operator
    switch (query.operator) {
      case 'equals':
        return { [field]: { $eq: value } };
      case 'not_equals':
        return { [field]: { $ne: value } };
      case 'less_than':
        return { [field]: { $lt: value } };
      case 'greater_than':
        return { [field]: { $gt: value } };
      case 'less_than_or_equal_to':
        return { [field]: { $lte: value } };
      case 'greater_than_or_equal_to':
        return { [field]: { $gte: value } };
      case 'in':
        return { [field]: { $in: value } };
      case 'not_in':
        return { [field]: { $nin: value } };
      case 'contains':
        return {
          [field]: { $regex: value, $options: 'i' },
        };
      case 'not_contains':
        return {
          [field]: { $not: { $regex: value, $options: 'i' } },
        };
      case 'starts_with':
        return {
          [field]: { $regex: '^' + value, $options: 'i' },
        };
      case 'ends_with':
        return {
          [field]: { $regex: value + '$', $options: 'i' },
        };
      default:
        // default to equals
        return { [field]: { $eq: value } };
    }
  },
};
