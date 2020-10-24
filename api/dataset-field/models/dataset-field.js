'use strict';

const info = {
  name: 'dataset-field',
  field: 'name',
};

module.exports = {
  lifecycles: {
    afterCreate: async (result, data) => {
      strapi.services.event.lifecycle_create({ info, result, data });
    },
    afterUpdate: async (result, params, data) => {
      strapi.services.event.lifecycle_update({ info, result, params, data });

      // watch for changes to specific fields, trigger refresh and set related to review
      if (strapi.services.helper.has_fields(['type'], data))
        strapi.services.dataset.refresh({ id: result.dataset.id });
      strapi
        .query('combinator-query')
        .update({ dataset_field: result.id }, { review: true });
    },
    afterDelete: async (result, params) => {
      strapi.services.event.lifecycle_delete({ info, result, params });

      // mark any combinator query that uses the deleted field for review
      strapi
        .query('combinator-query')
        .update({ dataset_field: result.id }, { review: true });
    },
  },
};
