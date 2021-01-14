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
      if (!strapi.services['helper'].hasFields(['review'], data)) {
        strapi.query('combinator').update({ id: result.id }, { review: false });
        strapi.query('combinator-query').update({ combinator: result.id }, { review: false });
      }
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
