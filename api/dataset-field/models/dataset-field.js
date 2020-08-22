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
      let watch_refresh = ['type'];
      if (_.intersection(_.keys(data), watch_refresh).length) {
        strapi.services.dataset.update_features({ id: result.dataset.id });
        strapi.services.helper.set_state(
          { dataset: result.dataset.id },
          'combinator',
          'pending',
          'Related fields have been updated, please verify combinator settings'
        );
      }
    },
  },
};
