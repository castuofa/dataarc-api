'use strict';

const CONTENT_TYPE = 'dataset-feature';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
  /**
   * Create a record.
   *
   * @return {Object}
   */

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
        ctx.state.user.id
      );

    return entry;
  },

  /**
   * Update a record.
   *
   * @return {Object}
   */

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
        ctx.state.user.id
      );

    return entry;
  },

  /**
   * delete a record.
   *
   * @return {Object}
   */

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
        ctx.state.user.id
      );

    return entry;
  },
};
