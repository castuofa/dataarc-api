'use strict';

const info = {
  name: 'combinator',
  field: 'name',
};

module.exports = {
  lifecycles: {
    beforeCreate: async (data) => {
      if (data.title && !data.name)
        data.name = await strapi.services['helper'].findUnique({
          content_type: info.name,
          field: info.field,
          value: data.title,
        });
    },
    beforeUpdate: async (params, data) => {
      if (data.title && !data.name)
        data.name = await strapi.services['helper'].findUnique({
          content_type: info.name,
          field: info.field,
          value: data.title,
        });
    },
    afterCreate: async (result, data) => {
      strapi.services['event'].lifecycle('create', info, result, {
        payload: { data },
      });
    },
    afterUpdate: async (result, params, data) => {
      strapi.services['event'].lifecycle('update', info, result, {
        payload: { params, data },
      });

      // if combinator was saved manually, run results to set relations
      if (!strapi.services['helper'].hasFields(['features'], data))
        strapi.services['combinator'].results({ id: result.id });
    },
    afterDelete: async (result, params) => {
      strapi.services['event'].lifecycle('delete', info, result, {
        payload: { params },
      });

      // remove related
      strapi.services['combinator'].removeQueries(result.id);
    },
  },
};
