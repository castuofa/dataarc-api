'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
  /**
   * Create a record.
   *
   * @return {Object}
   */

  async create(ctx) {
    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services['search'].create(data, { files });
    } else {
      entity = await strapi.services['search'].create(ctx.request.body);
    }
    let entry = sanitizeEntity(entity, {
      model: strapi.models['search'],
    });

    strapi.services.event.log(
      'update',
      strapi.models['search'].info.name,
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

  async update(ctx) {
    const { id } = ctx.params;

    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services['search'].update({ id }, data, {
        files,
      });
    } else {
      entity = await strapi.services['search'].update({ id }, ctx.request.body);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['search'],
    });

    strapi.services.event.log(
      'update',
      strapi.models['search'].info.name,
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

  async delete(ctx) {
    const { id } = ctx.params;

    const entity = await strapi.services['search'].delete({ id });

    let entry = sanitizeEntity(entity, {
      model: strapi.models['search'],
    });

    strapi.services.event.log(
      'update',
      strapi.models['search'].info.name,
      entry.name,
      ctx.state.user.id
    );

    return entry;
  },
};
