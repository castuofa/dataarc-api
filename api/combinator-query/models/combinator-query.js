'use strict';

const info = {
  name: 'combinator-query',
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

      // if query was set to review, mark combinator to review
      if (strapi.services.helper.has_fields(['review'], data)) {
        if (data.review)
          strapi
            .query('combinator')
            .update({ id: result.combinator }, { review: true });
      }
    },
    afterDelete: async (result, params) => {
      strapi.services.event.lifecycle_delete({ info, result, params });
    },
  },
};
