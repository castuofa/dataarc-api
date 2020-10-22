'use strict';

let event = {
  type: 'info',
  controller: 'dataset',
};

module.exports = {
  lifecycles: {
    beforeCreate: async (data) => {
      if (data.title && !data.name)
        data.name = await strapi.services.helper.find_unique({
          content_type: event.controller,
          field: 'name',
          value: data.title,
        });
    },
    beforeUpdate: async (params, data) => {
      if (data.title && !data.name)
        data.name = await strapi.services.helper.find_unique({
          content_type: event.controller,
          field: 'name',
          value: data.title,
        });
    },
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
      if (result == null) return;
      event.action = 'delete';
      event.item = result.name;
      event.payload = { params };
      if (result.updated_by != null) event.user = result.updated_by.id;
      strapi.services.helper.log(event);
    },
  },
};
