'use strict';

const _ = require('lodash');

module.exports = {
  removeQueries: async (id) => {
    strapi.query('combinator-query').model.deleteMany({ combinator: id });
  },

  markReview: async (id) => {
    strapi.query('combinator').update({ id }, { review: true });
  },

  updateFeatures: async (results) => {
    _.each(results.features, (feature) => {
      let combinators = _.union(feature.combinators, [results.combinator.id]);
      let concepts = _.union(
        feature.concepts,
        _.map(results.combinator.concepts, 'id')
      );
      strapi
        .query('feature')
        .update({ id: feature.id }, { combinators, concepts });
    });
  },

  saveResults: async (results) => {
    // set the related features
    let features = _.map(results.features, 'id');
    if (features.length) {
      strapi.services['combinator'].updateFeatures(results);
      strapi
        .query('combinator')
        .update({ id: results.combinator.id }, { features });
    }
  },

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

      // loop through the queries getting results
      let promises = [];
      _.each(entry.queries, (query) => {
        promises.push(strapi.services['combinator-query'].getObject(query));
      });

      await Promise.allSettled(promises).then((res) => {
        let results = _.groupBy(res, 'status');
        if (results.fulfilled) conditions = _.map(results.fulfilled, 'value');
      });

      // if conditions are empty we're done
      if (conditions.length == 0) return result;

      // build the query conditions and get our features
      let where = {
        dataset: entry.dataset,
        [op]: conditions,
      };

      // find the features and set the counts
      result.features = await strapi.query('feature').model.find(where);
      result.matched_count = result.features.length;
      result.total_count = await strapi
        .query('feature')
        .count({ dataset: entry.dataset });

      // save the results
      strapi.services['combinator'].saveResults(result);
    }

    return result;
  },
};
