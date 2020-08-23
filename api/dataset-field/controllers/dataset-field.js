'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
  create: async (ctx) => {
    let entity;

    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services['dataset-field'].create(data, { files });
    } else {
      entity = await strapi.services['dataset-field'].create(ctx.request.body);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['dataset-field'],
    });

    if (entry != null)
      strapi.services.event.log(
        'create',
        strapi.models['dataset-field'].info.name,
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
      entity = await strapi.services['dataset-field'].update({ id }, data, {
        files,
      });
    } else {
      entity = await strapi.services['dataset-field'].update(
        { id },
        ctx.request.body
      );
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['dataset-field'],
    });

    if (entry != null)
      strapi.services.event.log(
        'update',
        strapi.models['dataset-field'].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },

  delete: async (ctx) => {
    const { id } = ctx.params;
    const entity = await strapi.services['dataset-field'].delete({ id });

    let entry = sanitizeEntity(entity, {
      model: strapi.models['dataset-field'],
    });

    if (entry != null)
      strapi.services.event.log(
        'delete',
        strapi.models['dataset-field'].info.name,
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },
};
