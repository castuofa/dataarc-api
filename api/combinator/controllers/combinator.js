'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
  create: async (ctx) => {
    let entity;

    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services['combinator'].create(data, { files });
    } else {
      entity = await strapi.services['combinator'].create(ctx.request.body);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['combinator'],
    });

    if (entry != null)
      strapi.services.event.log(
        'create',
        strapi.models['combinator'].info.name,
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
      entity = await strapi.services['combinator'].update({ id }, data, {
        files,
      });
    } else {
      entity = await strapi.services['combinator'].update(
        { id },
        ctx.request.body
      );
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['combinator'],
    });

    if (entry != null)
      strapi.services.event.log(
        'update',
        strapi.models['combinator'].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },

  delete: async (ctx) => {
    const { id } = ctx.params;
    const entity = await strapi.services['combinator'].delete({ id });

    let entry = sanitizeEntity(entity, {
      model: strapi.models['combinator'],
    });

    if (entry != null)
      strapi.services.event.log(
        'delete',
        strapi.models['combinator'].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

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
      strapi.services.event.log(
        'refresh',
        strapi.models['combinator'].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },
};
