'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
  create: async (ctx) => {
    let entity;

    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services['temporal-coverage'].create(data, {
        files,
      });
    } else {
      entity = await strapi.services['temporal-coverage'].create(
        ctx.request.body
      );
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['temporal-coverage'],
    });

    if (entry != null)
      strapi.services.event.log(
        'create',
        strapi.models['temporal-coverage'].info.name,
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
      entity = await strapi.services['temporal-coverage'].update({ id }, data, {
        files,
      });
    } else {
      entity = await strapi.services['temporal-coverage'].update(
        { id },
        ctx.request.body
      );
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['temporal-coverage'],
    });

    if (entry != null)
      strapi.services.event.log(
        'update',
        strapi.models['temporal-coverage'].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },

  delete: async (ctx) => {
    const { id } = ctx.params;
    const entity = await strapi.services['temporal-coverage'].delete({ id });

    let entry = sanitizeEntity(entity, {
      model: strapi.models['temporal-coverage'],
    });

    if (entry != null)
      strapi.services.event.log(
        'delete',
        strapi.models['temporal-coverage'].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },
};
