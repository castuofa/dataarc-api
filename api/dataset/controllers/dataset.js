'use strict';

const { sanitizeEntity } = require('strapi-utils');

let event = {
  type: 'info',
  controller: 'dataset',
};

module.exports = {
  process: async (ctx) => {
    const { id } = ctx.params;

    let entity;
    try {
      entity = await strapi.services['dataset'].process({ id });
    } catch (err) {
      event.type = 'error';
      event.action = 'process';
      event.item = id;
      event.details = err.message;
      if (typeof ctx.state.user !== 'undefined') event.user = ctx.state.user.id;
      strapi.services.helper.log(event);
      return ctx.response.badData(err.message);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['dataset'],
    });

    // log the event
    if (entry != null) {
      event.action = 'process';
      event.item = entry.name;
      if (typeof ctx.state.user !== 'undefined') event.user = ctx.state.user.id;
      strapi.services.helper.log(event);
    }

    return entry;
  },

  refresh: async (ctx) => {
    const { id } = ctx.params;

    let entity;
    try {
      entity = await strapi.services['dataset'].refresh({ id });
    } catch (err) {
      event.type = 'error';
      event.action = 'refresh';
      event.item = id;
      event.details = err.message;
      if (typeof ctx.state.user !== 'undefined') event.user = ctx.state.user.id;
      strapi.services.helper.log(event);
      return ctx.response.badData(err.message);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['dataset'],
    });

    // log the event
    if (entry != null) {
      event.action = 'refresh';
      event.item = entry.name;
      if (typeof ctx.state.user !== 'undefined') event.user = ctx.state.user.id;
      strapi.services.helper.log(event);
    }

    return entry;
  },
};
