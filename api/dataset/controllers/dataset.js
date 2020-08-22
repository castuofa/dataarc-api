'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
  create: async (ctx) => {
    let entity;

    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.dataset.create(data, { files });
    } else {
      entity = await strapi.services.dataset.create(ctx.request.body);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['dataset'],
    });

    if (entry != null)
      strapi.services.event.log(
        'update',
        strapi.models['dataset'].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },

  update: async (ctx) => {
    const { id } = ctx.params;
    let entity;

    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.dataset.update({ id }, data, {
        files,
      });
    } else {
      entity = await strapi.services.dataset.update({ id }, ctx.request.body);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['dataset'],
    });

    if (entry != null)
      strapi.services.event.log(
        'update',
        strapi.models['dataset'].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },

  delete: async (ctx) => {
    const { id } = ctx.params;
    const entity = await strapi.services.dataset.delete({ id });

    let entry = sanitizeEntity(entity, {
      model: strapi.models['dataset'],
    });

    if (entry != null)
      strapi.services.event.log(
        'update',
        strapi.models['dataset'].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },

  process: async (ctx) => {
    const { id } = ctx.params;

    let entity;
    try {
      entity = await strapi.services.dataset.process({ id });
    } catch (err) {
      // set process to failed and return error
      strapi.services.helper.set_state(id, 'dataset', 'failed', err.message);
      return ctx.response.badData(err.message);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['dataset'],
    });

    if (entry != null) {
      // log the process event
      strapi.services.event.log(
        'process',
        strapi.models['dataset'].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

      // set refresh to pending for related combinaotors
      strapi.services.helper.set_state(
        { dataset: id },
        'combinator',
        'pending',
        'Dataset has been updated, please verify combinator settings'
      );
    }

    return entry;
  },

  refresh: async (ctx) => {
    const { id } = ctx.params;

    let entity;
    try {
      entity = await strapi.services.dataset.refresh({ id });
    } catch (err) {
      strapi.services.helper.set_state(id, 'dataset', 'failed', err.message);
      return ctx.response.badData(err.message);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['dataset'],
    });

    if (entry != null)
      strapi.services.event.log(
        'refresh',
        strapi.models['dataset'].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },
};
