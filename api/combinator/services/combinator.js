'use strict';

const _ = require('lodash');

module.exports = {
  results: async (params) => {
    let result = {
      combinator: null,
      features: [],
      matched_count: 0,
      total_count: 0,
    };

    // find the entry
    const entry = await strapi.query('combinator').findOne(params);

    // only proceed if we found an entry
    if (entry != null) {
      let conditions = [];
      result.combinator = entry;

      // loop through the queries getting results
      _.each(entry.queries, async (query) => {
        // set field name
        let field = 'properties.' + query.property;

        // set the value
        let value = Number(query.value);
        if (isNaN(value)) value = query.value;

        // if value is null, empty, undefined, etc, skip this query
        if (!value) return;

        // add the query that matches the operator
        switch (query.operator) {
          case 'equals':
            conditions.push({ [field]: { $eq: value } });
            break;
          case 'not_equals':
            conditions.push({ [field]: { $ne: value } });
            break;
          case 'less_than':
            conditions.push({ [field]: { $lt: value } });
            break;
          case 'greater_than':
            conditions.push({ [field]: { $gt: value } });
            break;
          case 'less_than_or_equal_to':
            conditions.push({ [field]: { $lte: value } });
            break;
          case 'greater_than_or_equal_to':
            conditions.push({ [field]: { $gte: value } });
            break;
          case 'in':
            conditions.push({ [field]: { $in: value } });
            break;
          case 'not_in':
            conditions.push({ [field]: { $nin: value } });
            break;
          case 'contains':
            conditions.push({
              [field]: { $regex: value, $options: 'i' },
            });
            break;
          case 'not_contains':
            conditions.push({
              [field]: { $not: { $regex: value, $options: 'i' } },
            });
            break;
          case 'starts_with':
            conditions.push({
              [field]: { $regex: '^' + value, $options: 'i' },
            });
            break;
          case 'ends_with':
            conditions.push({
              [field]: { $regex: value + '$', $options: 'i' },
            });
            break;
          default:
            // default to equals
            conditions.push({ [field]: { $eq: value } });
            break;
        }
      });

      // set the combinator operator
      let op;
      switch (entry.operator) {
        case 'and':
          op = '$and';
          break;
        case 'or':
          op = '$or';
          break;
        case 'nor':
          op = '$nor';
          break;
        case 'not':
          op = '$not';
          break;
        default:
          // default to and
          op = '$and';
          break;
      }

      // if conditions are empty we're done
      if (conditions.length == 0) return result;

      // build the query conditions and get our features
      let where = {
        dataset: entry.dataset.id,
        [op]: conditions,
      };

      // find the features and set the counts
      result.features = await strapi.query('feature').model.find(where);
      result.matched_count = result.features.length;
      result.total_count = await strapi
        .query('feature')
        .count({ dataset: entry.dataset.id });
    }

    return result;
  },

  refresh: async (params) => {
    // find the entry
    const entry = await strapi.query('combinator').findOne(params);

    // only proceed if we found an entry
    if (entry != null) {
      // refresh the entry
    }

    return entry;
  },
};
