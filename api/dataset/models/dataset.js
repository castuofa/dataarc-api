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
      // watch for changes to specific fields
      if (_.intersection(_.keys(data), ['source']).length) {
        strapi.services.helper.set_state(
          result.id,
          'dataset',
          'pending',
          'Dataset source has been updated, processing required'
        );
      } else if (
        _.intersection(_.keys(data), [
          'title_layout',
          'summary_layout',
          'details_layout',
          'link_layout',
        ]).length
      ) {
        strapi.services.dataset.refresh({ id: result.id });
      }
    },
  },
};
