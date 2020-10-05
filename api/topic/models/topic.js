'use strict';

module.exports = {
  lifecycles: {
    afterCreate: async (result, data) => {
      if (result == null) return;
      strapi.services.helper.log_event(
        'create',
        'topic',
        result.name,
        result.updated_by == null ? null : result.updated_by.id,
        { data }
      );
    },
    afterUpdate: async (result, params, data) => {
      if (result == null) return;
      strapi.services.helper.log_event(
        'update',
        'topic',
        result.name,
        result.updated_by == null ? null : result.updated_by.id,
        { params, data }
      );
    },
    afterDelete: async (result, params) => {
      if (result == null) return;
      strapi.services.helper.log_event(
        'delete',
        'topic',
        result.name,
        result.updated_by == null ? null : result.updated_by.id,
        { params }
      );
    },
  },
};
