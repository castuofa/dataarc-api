'use strict';

const _ = require('lodash');
const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  results: async (ctx) => {
    const { id } = ctx.params;

    let results;
    try {
      results = await strapi.services['combinator'].results({ id });
    } catch (err) {
      return ctx.response.badData(err.message);
    }

    // santitize the results
    results.combinator = sanitizeEntity(results.combinator, {
      model: strapi.models['combinator'],
    });
    results.features = results.features.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models['feature'] })
    );

    return results;
  },
};
