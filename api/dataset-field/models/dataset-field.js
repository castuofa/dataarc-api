'use strict';

const _ = require('lodash');

module.exports = {
  lifecycles: {
    beforeCreate: async (data) => {
      if (data.title && !data.name) {
        data.name = strapi.services.helper.get_name(data.title);
      }
    },
    beforeUpdate: async (params, data) => {
      if (data.title && !data.name) {
        data.name = strapi.services.helper.get_name(data.title);
      }
    },
    afterUpdate: async (result, params, data) => {
      // watch for changes to specific fields and set state
      let watch_for = ['type'];
      if (_.intersection(_.keys(data), watch_for).length > 0) {
        strapi.services.helper.set_state(
          result.id,
          'dataset',
          'refresh',
          'pending',
          'Related fields have been updated, please refresh the dataset'
        );
        strapi.services.helper.set_state(
          { dataset: result.dataset.id },
          'combinator',
          'refresh',
          'pending',
          'Related fields have been updated, please verify combinator settings'
        );
      }
    },
  },
};
