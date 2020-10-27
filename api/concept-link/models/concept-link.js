'use strict';

let info = {
  name: 'concept-link',
  field: 'name',
};

module.exports = {
  lifecycles: {
    afterCreate: async (result, data) => {
      strapi.services.event.lifecycle('create', info, result, {
        payload: { data },
      });
    },
    afterUpdate: async (result, params, data) => {
      strapi.services.event.lifecycle('update', info, result, {
        payload: { params, data },
      });
    },
    afterDelete: async (result, params) => {
      strapi.services.event.lifecycle('delete', info, result, {
        payload: { params },
      });
    },
  },
};
