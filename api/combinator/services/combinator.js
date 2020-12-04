'use strict';

const _ = require('lodash');

module.exports = {
  removeQueries: async (id) => {
    strapi.query('combinator-query').model.deleteMany({ combinator: id });
  },

  markReview: async (id) => {
    strapi.query('combinator').update({ id }, { review: true });
  },

  saveResults: async (results) => {
    // set the related features
    let features = _.map(results.features, 'id');
    if (features.length) {
      await strapi
        .query('combinator')
        .update({ id: results.combinator.id }, { features });
    }
  },

  // set refresh flag
  setRefresh: async (id, value, datetime) => {
    datetime = datetime || null;
    let data = { refresh: value };
    if (datetime) data.refreshed = datetime;
    return strapi.query('combinator').update({ id: id }, data);
  },

  refreshQuery: async () => {
    const combinator = await strapi
      .query('combinator')
      .model.findOneAndUpdate(
        { refresh: true, busy: false },
        { $set: { busy: true } }
      );
    if (combinator) {
      let startCombinator = Date.now();

      // run the results
      await strapi.services['combinator'].refresh(combinator);

      // set the refresh datetime / boolean
      await strapi
        .query('combinator')
        .update(
          { id: combinator.id },
          { refresh: false, busy: false, refreshed: Date.now() }
        );

      log(
        'debug',
        `Combinator ${combinator.id} has been refreshed`,
        startCombinator
      );
    } else {
      log('debug', 'No combinators to refresh');
    }
  },

  refresh: async (combinator) => {
    let result = {
      combinator: null,
      features: [],
      matched_count: 0,
      total_count: 0,
    };

    // only proceed if we found an combinator
    if (combinator != null) {
      let conditions = [];
      result.combinator = combinator;

      // set the combinator operator
      let op;
      switch (combinator.operator) {
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

      // loop through the queries getting results
      for (const query of combinator.queries) {
        // get the field object
        let dataset_field = await strapi
          .query('dataset-field')
          .findOne({ id: query.dataset_field });
        conditions.push(getObject(dataset_field, query));
      }
      // _.each(combinator.queries, (query) => {
      //   promises.push(getObject(query));
      // });

      // await Promise.allSettled(promises).then((res) => {
      //   let results = _.groupBy(res, 'status');
      //   if (results.fulfilled) conditions = _.map(results.fulfilled, 'value');
      // });

      // if conditions are empty we're done
      conditions = _.compact(conditions);
      if (conditions.length == 0) return result;

      // build the query conditions and get our features
      let where = {
        dataset: combinator.dataset.id,
        [op]: conditions,
      };

      // find the features and set the counts
      result.features = await strapi.query('feature').model.find(where);
      result.matched_count = result.features.length;
      result.total_count = await strapi
        .query('feature')
        .count({ dataset: combinator.dataset });

      // save the results
      strapi.services['combinator'].saveResults(result);
    }

    return result;
  },

  results: async (params) => {
    // find the combinator
    const combinator = await strapi.query('combinator').findOne(params);
    return strapi.services['combinator'].refresh(combinator);
  },
};

// simple log function with time calculation
const log = (type, msg, time = '') => {
  type = type || 'debug';
  if (time) time = ` (${Math.ceil(Date.now() - time)} ms)`;
  strapi.log[type](`${msg}${time}`);
};

const getObject = (dataset_field, query) => {
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
};
