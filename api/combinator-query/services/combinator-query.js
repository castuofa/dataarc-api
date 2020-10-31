'use strict';

module.exports = {
  markReviewByField: async (id) => {
    strapi
      .query('combinator-query')
      .update({ dataset_field: id }, { review: true })
      .catch((e) => {
        strapi.log.error(`Unable to update combinator-query: ${e.message}`);
      });
  },
};
