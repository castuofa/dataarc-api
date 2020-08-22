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
      let watch_process = ['source'];
      let watch_refresh = [
        'title_layout',
        'summary_layout',
        'details_layout',
        'link_layout',
      ];
      if (_.intersection(_.keys(data), watch_process).length) {
        strapi.services.helper.set_state(
          result.id,
          'dataset',
          'process',
          'pending',
          'Dataset source has been updated, processing required'
        );
      }
      if (_.intersection(_.keys(data), watch_refresh).length) {
        strapi.services.helper.set_state(
          result.id,
          'dataset',
          'refresh',
          'pending',
          'Dataset layout(s) have been updated, refresh is required'
        );
      }
    },
  },
};
