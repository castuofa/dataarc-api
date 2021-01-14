'use strict';

const info = {
  name: 'dataset-field',
  field: 'name',
};

module.exports = {
  lifecycles: {
    afterCreate: async (result, data) => {
      strapi.services['event'].lifecycle('create', info, result, {
        payload: { data },
      });
    },
    afterUpdate: async (result, params, data) => {
      strapi.services['event'].lifecycle('update', info, result, {
        payload: { params, data },
      });

      // watch for changes to specific fields, trigger refresh and set related to review
      if (strapi.services['helper'].hasFields(['type'], data))
        strapi.services['dataset'].flagRefresh(result.dataset);
      if (result)
        strapi.services['combinator-query'].markReviewByField(result.id);
      if (!strapi.services['helper'].hasFields(['review'], data)) {
        strapi.query('dataset-field').update({ id: result.id }, { review: false });
      }
    },
    afterDelete: async (result, params) => {
      strapi.services['event'].lifecycle('delete', info, result, {
        payload: { params },
      });

      // mark any combinator query that uses the deleted field for review
      if (result)
        strapi.services['combinator-query'].markReviewByField(result.id);
    },
  },
};
