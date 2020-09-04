'use strict';

const _ = require('lodash');

module.exports = {
  lifecycles: {
    beforeCreate: async (data) => {
      if (data.property && data.operator && data.value && !data.name)
        data.name = await strapi.services.helper.find_unique({
          content_type: 'combinator-query',
          field: 'name',
          value: data.property + '_' + data.operator + '_' + data.value,
        });
    },
    beforeUpdate: async (params, data) => {
      if (data.property && data.operator && data.value && !data.name)
        data.name = await strapi.services.helper.find_unique({
          content_type: 'combinator-query',
          field: 'name',
          value: data.property + '_' + data.operator + '_' + data.value,
        });
    },
    afterCreate: async (result, data) => {
      if (result == null) return;
      strapi.services.helper.log_event(
        'create',
        'combinator-query',
        result.name,
        result.updated_by == null ? null : result.updated_by.id,
        { data }
      );
    },
    afterUpdate: async (result, params, data) => {
      if (result == null) return;
      strapi.services.helper.log_event(
        'update',
        'combinator-query',
        result.name,
        result.updated_by == null ? null : result.updated_by.id,
        { params, data }
      );

      // watch for changes to specific fields and set state
      if (
        _.intersection(_.keys(data), ['property', 'operator', 'value', 'field'])
          .length
      ) {
        strapi.services.helper.set_state(
          { dataset: result.combinator.id },
          'combinator',
          'pending',
          'Related field(s) have changed, please verify queries'
        );
      }
    },
    afterDelete: async (result, params) => {
      if (result == null) return;
      strapi.services.helper.log_event(
        'delete',
        'combinator-query',
        result.name,
        result.updated_by == null ? null : result.updated_by.id,
        { params }
      );
    },
  },
};
