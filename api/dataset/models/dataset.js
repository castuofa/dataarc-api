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
    afterCreate: async (result, data) => {
      if (result != null)
        strapi.services.helper.log_event(
          'create',
          'dataset',
          result.name,
          result.updated_by == null ? null : result.updated_by.id,
          { data }
        );
    },
    afterUpdate: async (result, params, data) => {
      if (result != null)
        strapi.services.helper.log_event(
          'update',
          'dataset',
          result.name,
          result.updated_by == null ? null : result.updated_by.id,
          { params, data }
        );

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
    afterDelete: async (result, params) => {
      if (result != null)
        strapi.services.helper.log_event(
          'delete',
          'dataset',
          result.name,
          result.updated_by == null ? null : result.updated_by.id,
          { params }
        );
    },
  },
};
