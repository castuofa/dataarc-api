'use strict';

module.exports = {
  lifecycles: {
    beforeCreate: async (data) => {
      if (data.title && !data.name)
        data.name = await strapi.services.helper.find_unique({
          content_type: 'map-layer',
          field: 'name',
          value: data.title,
        });
    },
    beforeUpdate: async (params, data) => {
      if (data.title && !data.name)
        data.name = await strapi.services.helper.find_unique({
          content_type: 'map-layer',
          field: 'name',
          value: data.title,
        });
    },
    afterCreate: async (result, data) => {
      if (result == null) return;
      strapi.services.helper.log_event(
        'create',
        'map-layer',
        result.name,
        result.updated_by == null ? null : result.updated_by.id,
        { data }
      );
    },
    afterUpdate: async (result, params, data) => {
      if (result == null) return;
      strapi.services.helper.log_event(
        'update',
        'map-layer',
        result.name,
        result.updated_by == null ? null : result.updated_by.id,
        { params, data }
      );
    },
    afterDelete: async (result, params) => {
      if (result == null) return;
      strapi.services.helper.log_event(
        'delete',
        'map-layer',
        result.name,
        result.updated_by == null ? null : result.updated_by.id,
        { params }
      );
    },
  },
};
