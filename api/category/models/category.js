'use strict';

const info = {
  name: 'category',
  field: 'name',
};

module.exports = {
  lifecycles: {
    beforeCreate: async (data) => {
      if (data.title && !data.name)
        data.name = await strapi.services.helper.find_unique({
          content_type: info.name,
          field: info.field,
          value: data.title,
        });
    },
    beforeUpdate: async (params, data) => {
      if (data.title && !data.name)
        data.name = await strapi.services.helper.find_unique({
          content_type: info.name,
          field: info.field,
          value: data.title,
        });
    },
    afterCreate: async (result, data) => {
      strapi.services.event.lifecycle_create({ info, result, data });
    },
    afterUpdate: async (result, params, data) => {
      strapi.services.event.lifecycle_update({ info, result, params, data });
    },
    afterDelete: async (result, params) => {
      strapi.services.event.lifecycle_delete({ info, result, params });
    },
  },
};
