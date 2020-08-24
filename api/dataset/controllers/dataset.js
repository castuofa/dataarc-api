'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
  process: async (ctx) => {
    const { id } = ctx.params;

    let entity;
    try {
      entity = await strapi.services['dataset'].process({ id });
    } catch (err) {
      strapi.services.helper.set_state(id, 'dataset', 'failed', err.message);
      return ctx.response.badData(err.message);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['dataset'],
    });

    if (entry != null) {
      strapi.services.helper.log_event(
        'process',
        'dataset',
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );
    }

    return entry;
  },

  refresh: async (ctx) => {
    const { id } = ctx.params;

    let entity;
    try {
      entity = await strapi.services['dataset'].refresh({ id });
    } catch (err) {
      strapi.services.helper.set_state(id, 'dataset', 'failed', err.message);
      return ctx.response.badData(err.message);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['dataset'],
    });

    if (entry != null)
      strapi.services.helper.log_event(
        'refresh',
        'dataset',
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },
};
