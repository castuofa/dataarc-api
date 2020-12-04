'use strict';

const info = {
  name: 'dataset',
  field: 'name',
};

module.exports = {
  lifecycles: {
    beforeCreate: async (data) => {
      if (data.title && !data.name)
        data.name = await strapi.services['helper'].findUnique({
          content_type: info.name,
          field: info.field,
          value: data.title,
        });
    },
    afterCreate: async (result, data) => {
      strapi.services['event'].lifecycle('create', info, result, {
        payload: { data },
      });
    },
    afterUpdate: async (result, params, data) => {
      strapi.services['event'].lifecycle('update', info, result, {
        payload: { params, data },
      });

      // refresh combinators when dataset changes
      // strapi.services['dataset'].refreshCombinators(result);

      // refresh dataset if layouts have changed
      // if (
      //   strapi.services['helper'].hasFields(
      //     ['title_layout', 'summary_layout', 'details_layout', 'link_layout'],
      //     data
      //   )
      // )
      // strapi.services['dataset'].refreshFeatures(result);

      // refresh dataset if it has been processed
      // if (strapi.services['helper'].hasFields(['processed_at'], data))
      // if (result.processed_at != null)
      // strapi.services['dataset'].refreshFeatures(result);
    },
    afterDelete: async (result, params) => {
      strapi.services['event'].lifecycle('delete', info, result, {
        payload: { params },
      });

      // delete related
      strapi.services['dataset'].removeFeatures(result.id);
      strapi.services['dataset'].removeFields(result.id);
      strapi.services['dataset'].removeCombinators(result.id);
    },
  },
};
