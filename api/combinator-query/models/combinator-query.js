'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/models.html#lifecycle-hooks)
 * to customize this model
 */

module.exports = {
  lifecycles: {
    afterCreate: async (result, data) => {
      if (result != null)
        strapi.services.helper.log_event(
          'create',
          'combinator-query',
          result.name,
          result.updated_by == null ? null : result.updated_by.id,
          { data }
        );
    },
    afterUpdate: async (result, params, data) => {
      if (result != null)
        strapi.services.helper.log_event(
          'update',
          'combinator-query',
          result.name,
          result.updated_by == null ? null : result.updated_by.id,
          { params, data }
        );
    },
    afterDelete: async (result, params) => {
      if (result != null)
        strapi.services.helper.log_event(
          'delete',
          'combinator-query',
          result.name,
          result.updated_by == null ? null : result.updated_by.id,
          { params }
        );
    },
  },
};
