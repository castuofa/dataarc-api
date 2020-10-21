'use strict';

let event = {
  type: 'info',
  controller: 'combinator-query',
};

module.exports = {
  lifecycles: {
    afterCreate: async (result, data) => {
      if (result == null) return;
      event.action = 'create';
      event.item = result.name;
      event.payload = { data };
      event.user = result.updated_by == null ? null : result.updated_by.id;
      strapi.services.helper.log(info);
    },
    afterUpdate: async (result, params, data) => {
      if (result == null) return;
      event.action = 'update';
      event.item = result.name;
      event.payload = { params, data };
      event.user = result.updated_by == null ? null : result.updated_by.id;
      strapi.services.helper.log(info);
    },
    afterDelete: async (result, params) => {
      if (result == null) return;
      event.action = 'delete';
      event.item = result.name;
      event.payload = { params };
      event.user = result.updated_by == null ? null : result.updated_by.id;
      strapi.services.helper.log(info);
    },
  },
};
