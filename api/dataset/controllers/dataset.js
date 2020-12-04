'use strict';

const { sanitizeEntity } = require('strapi-utils');

const info = {
  name: 'dataset',
  field: 'name',
};

module.exports = {
  process: async (ctx) => {
    const { id } = ctx.params;
    const entity = await strapi.services[info.name].findOne({ id });

    if (entity != null) {
      // log the event
      strapi.services['event'].controller(info, entity, ctx);

      // flag dataset for processing
      strapi.services[info.name].flagProcess(entity.id);
    }
    return sanitizeEntity(entity, { model: strapi.models[info.name] });
  },

  refresh: async (ctx) => {
    const { id } = ctx.params;
    const entity = await strapi.services[info.name].findOne({ id });

    if (entity != null) {
      // log the event
      strapi.services['event'].controller(info, entity, ctx);

      // flag dataset for refreshing
      strapi.services[info.name].flagRefresh(entity.id);
    }
    return sanitizeEntity(entity, { model: strapi.models[info.name] });
  },
};
