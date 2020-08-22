'use strict';

const CONTENT_TYPE = 'dataset';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
  create: async (ctx) => {
    let entity;

    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services[CONTENT_TYPE].create(data, { files });
    } else {
      entity = await strapi.services[CONTENT_TYPE].create(ctx.request.body);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models[CONTENT_TYPE],
    });

    if (entry != null)
      strapi.services.event.log(
        'update',
        strapi.models[CONTENT_TYPE].info.name,
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
      entity = await strapi.services[CONTENT_TYPE].update({ id }, data, {
        files,
      });
    } else {
      entity = await strapi.services[CONTENT_TYPE].update(
        { id },
        ctx.request.body
      );
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models[CONTENT_TYPE],
    });

    if (entry != null)
      strapi.services.event.log(
        'update',
        strapi.models[CONTENT_TYPE].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },

  delete: async (ctx) => {
    const { id } = ctx.params;
    const entity = await strapi.services[CONTENT_TYPE].delete({ id });

    let entry = sanitizeEntity(entity, {
      model: strapi.models[CONTENT_TYPE],
    });

    if (entry != null)
      strapi.services.event.log(
        'update',
        strapi.models[CONTENT_TYPE].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },

  process: async (ctx) => {
    const { id } = ctx.params;

    let entity;
    try {
      entity = await strapi.services[CONTENT_TYPE].process({ id });
    } catch (err) {
      strapi.services[CONTENT_TYPE].process_state(id, 'failed', err.message);
      return ctx.response.badData(err.message);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models[CONTENT_TYPE],
    });

    if (entry != null)
      strapi.services.event.log(
        'process',
        strapi.models[CONTENT_TYPE].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },

  refresh: async (ctx) => {
    const { id } = ctx.params;

    let entity;
    try {
      entity = await strapi.services[CONTENT_TYPE].refresh({ id });
    } catch (err) {
      strapi.services[CONTENT_TYPE].refresh_state(id, 'failed', err.message);
      return ctx.response.badData(err.message);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models[CONTENT_TYPE],
    });

    if (entry != null)
      strapi.services.event.log(
        'refresh',
        strapi.models[CONTENT_TYPE].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },
};
