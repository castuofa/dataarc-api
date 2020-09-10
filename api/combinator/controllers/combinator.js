'use strict';

const _ = require('lodash');
const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  random: async (ctx) => {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services['combinator'].search(ctx.query);
    } else {
      entities = await strapi.services['combinator'].find(ctx.query);
    }
    return sanitizeEntity(entities[_.random(entities.length)], {
      model: strapi.models['combinator'],
    });
  },

  results: async (ctx) => {
    const { id } = ctx.params;

    let results;
    try {
      results = await strapi.services['combinator'].results({ id });
    } catch (err) {
      return ctx.response.badData(err.message);
    }

    // santitize the results
    results.combinator = sanitizeEntity(results.combinator, {
      model: strapi.models['combinator'],
    });
    results.features = results.features.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models['feature'] })
    );

    return results;
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
