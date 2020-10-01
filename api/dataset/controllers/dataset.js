'use strict';

const _ = require('lodash');
const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  random: async (ctx) => {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services['dataset'].search(ctx.query);
    } else {
      entities = await strapi.services['dataset'].find(ctx.query);
    }
    return sanitizeEntity(entities[_.random(entities.length)], {
      model: strapi.models['dataset'],
    });
  },

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

  refreshAll: async (ctx) => {
    let entities = await strapi.services['dataset'].find();
    _.each(entities, (dataset) => {
      ctx.params = { id: dataset.id };
      strapi.controllers['dataset'].refresh(ctx);
    });
    return true;
  },
};
