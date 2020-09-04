'use strict';

module.exports = {
  lifecycles: {
    beforeCreate: async (data) => {
      if (data.title && !data.name)
        data.name = await strapi.services.helper.find_unique({
          content_type: 'feature',
          field: 'name',
          value: data.title,
        });
    },
    beforeUpdate: async (params, data) => {
      if (data.title && !data.name)
        data.name = await strapi.services.helper.find_unique({
          content_type: 'feature',
          field: 'name',
          value: data.title,
        });
    },
    // DISABLE THESE FOR NOW, TOO MANY EVENTS WHEN RUNNING PROCESS/REFRESH
    // afterCreate: async (result, data) => {
    //   if (result != null)
    //     strapi.services.helper.log_event(
    //       'create',
    //       'feature',
    //       result.id,
    //       result.updated_by == null ? null : result.updated_by.id,
    //       { data }
    //     );
    // },
    // afterUpdate: async (result, params, data) => {
    //   if (result != null)
    //     strapi.services.helper.log_event(
    //       'update',
    //       'feature',
    //       result.id,
    //       result.updated_by == null ? null : result.updated_by.id,
    //       { params, data }
    //     );
    // },
    // afterDelete: async (result, params) => {
    //   if (result != null)
    //     strapi.services.helper.log_event(
    //       'delete',
    //       'feature',
    //       result.id,
    //       result.updated_by == null ? null : result.updated_by.id,
    //       { params }
    //     );
    // },
  },
};
