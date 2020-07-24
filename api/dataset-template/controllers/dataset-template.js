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
      entity = await strapi.services['dataset-template'].create(data, {
        files,
      });
    } else {
      entity = await strapi.services['dataset-template'].create(
        ctx.request.body
      );
    }
    let entry = sanitizeEntity(entity, {
      model: strapi.models['dataset-template'],
    });

    strapi.services.event.log(
      'update',
      strapi.models['dataset-template'].info.name,
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
      entity = await strapi.services['dataset-template'].update({ id }, data, {
        files,
      });
    } else {
      entity = await strapi.services['dataset-template'].update(
        { id },
        ctx.request.body
      );
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['dataset-template'],
    });

    strapi.services.event.log(
      'update',
      strapi.models['dataset-template'].info.name,
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

    const entity = await strapi.services['dataset-template'].delete({ id });

    let entry = sanitizeEntity(entity, {
      model: strapi.models['dataset-template'],
    });

    strapi.services.event.log(
      'update',
      strapi.models['dataset-template'].info.name,
      entry.name,
      ctx.state.user.id
    );

    return entry;
  },
};
