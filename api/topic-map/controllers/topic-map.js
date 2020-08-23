'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
  create: async (ctx) => {
    let entity;

    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services['topic-map'].create(data, { files });
    } else {
      entity = await strapi.services['topic-map'].create(ctx.request.body);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['topic-map'],
    });

    if (entry != null)
      strapi.services.event.log(
        'create',
        strapi.models['topic-map'].info.name,
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
      entity = await strapi.services['topic-map'].update({ id }, data, {
        files,
      });
    } else {
      entity = await strapi.services['topic-map'].update(
        { id },
        ctx.request.body
      );
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['topic-map'],
    });

    if (entry != null)
      strapi.services.event.log(
        'update',
        strapi.models['topic-map'].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },

  delete: async (ctx) => {
    const { id } = ctx.params;
    const entity = await strapi.services['topic-map'].delete({ id });

    let entry = sanitizeEntity(entity, {
      model: strapi.models['topic-map'],
    });

    if (entry != null)
      strapi.services.event.log(
        'delete',
        strapi.models['topic-map'].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },

  process: async (ctx) => {
    const { id } = ctx.params;

    let entity = await strapi.services['topic-map'].process({ id });
    let entry = sanitizeEntity(entity, {
      model: strapi.models['topic-map'],
    });

    if (entry != null)
      strapi.services.event.log(
        'process',
        strapi.models['topic-map'].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },
};
