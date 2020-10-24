'use strict';

const info = {
  name: 'spatial-coverage',
  field: 'name',
};

module.exports = {
  lifecycles: {
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
