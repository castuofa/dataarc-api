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
};
