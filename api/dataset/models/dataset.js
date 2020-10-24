'use strict';

const info = {
  name: 'dataset',
  field: 'name',
};

module.exports = {
  lifecycles: {
    beforeCreate: async (data) => {
      if (data.title && !data.name)
        data.name = await strapi.services.helper.find_unique({
          content_type: info.name,
          field: info.field,
          value: data.title,
        });
    },
    beforeUpdate: async (params, data) => {
      if (data.title && !data.name)
        data.name = await strapi.services.helper.find_unique({
          content_type: info.name,
          field: info.field,
          value: data.title,
        });
    },
    afterCreate: async (result, data) => {
      strapi.services.event.lifecycle_create({ info, result, data });
    },
    afterUpdate: async (result, params, data) => {
      strapi.services.event.lifecycle_update({ info, result, params, data });

      // refresh dataset if layouts have changed
      if (
        strapi.services.helper.has_fields(
          ['title_layout', 'summary_layout', 'details_layout', 'link_layout'],
          data
        )
      )
        strapi.services.dataset.refresh({ id: result.id });

      // refresh dataset if it has been processed
      if (strapi.services.helper.has_fields(['processed_at'], data))
        if (result.processed_at != null)
          strapi.services.dataset.refresh({ id: result.id });
    },
    afterDelete: async (result, params) => {
      strapi.services.event.lifecycle_delete({ info, result, params });

      // delete related data
      strapi.query('combinator').delete({ dataset: result.id });
      strapi.query('dataset-field').delete({ dataset: result.id });
      strapi.query('feature').delete({ dataset: result.id });
    },
  },
};
