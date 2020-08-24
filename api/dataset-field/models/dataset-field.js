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
          'dataset-field',
          result.name,
          result.updated_by == null ? null : result.updated_by.id,
          { data }
        );
    },
    afterUpdate: async (result, params, data) => {
      if (result != null)
        strapi.services.helper.log_event(
          'update',
          'dataset-field',
          result.name,
          result.updated_by == null ? null : result.updated_by.id,
          { params, data }
        );

      // watch for changes to specific fields and set state
      let watch_refresh = ['type'];
      if (_.intersection(_.keys(data), watch_refresh).length) {
        strapi.services.dataset.refresh({ id: result.dataset.id });
        strapi.services.helper.set_state(
          { dataset: result.dataset.id },
          'combinator',
          'pending',
          'Related field(s) have changed, please verify queries'
        );
        strapi.services.helper.set_state(
          { field: result.id },
          'combinator-query',
          'pending',
          'Related field has changed, please verify query settings'
        );
      }
    },
    afterDelete: async (result, params) => {
      if (result != null)
        strapi.services.helper.log_event(
          'delete',
          'dataset-field',
          result.name,
          result.updated_by == null ? null : result.updated_by.id,
          { params }
        );
    },
  },
};
