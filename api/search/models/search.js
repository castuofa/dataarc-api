'use strict';

let event = {
  type: 'info',
  controller: 'search',
};

module.exports = {
  lifecycles: {
    afterCreate: async (result, data) => {
      if (result == null) return;
      event.action = 'create';
      event.item = result.name;
      event.payload = { data };
      if (result.updated_by != null) event.user = result.updated_by.id;
      strapi.services.helper.log(event);
    },
    afterUpdate: async (result, params, data) => {
      if (result == null) return;
      event.action = 'update';
      event.item = result.name;
      event.payload = { params, data };
      if (result.updated_by != null) event.user = result.updated_by.id;
      strapi.services.helper.log(event);
    },
    afterDelete: async (result, params) => {
      if (result == null) return;
      event.action = 'delete';
      event.item = result.name;
      event.payload = { params };
      if (result.updated_by != null) event.user = result.updated_by.id;
      strapi.services.helper.log(event);
    },
  },
};
