'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
  results: async (ctx) => {
    const { id } = ctx.params;

    let entity;
    try {
      entity = await strapi.services['combinator'].query({ id });
    } catch (err) {
      return ctx.response.badData(err.message);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['combinator'],
    });

    return entry;
  },
  refresh: async (ctx) => {
    const { id } = ctx.params;

    let entity;
    try {
      entity = await strapi.services['combinator'].refresh({ id });
    } catch (err) {
      strapi.services.helper.set_state(id, 'combinator', 'failed', err.message);
      return ctx.response.badData(err.message);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['combinator'],
    });

    if (entry != null)
      strapi.services.helper.log_event(
        'refresh',
        'combinator',
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },
};
