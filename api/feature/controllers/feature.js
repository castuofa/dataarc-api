'use strict';

const _ = require('lodash');
const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  random: async (ctx) => {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services['feature'].search(ctx.query);
    } else {
      entities = await strapi.services['feature'].find(ctx.query);
    }
    return sanitizeEntity(entities[_.random(entities.length)], {
      model: strapi.models['feature'],
    });
  },

  refresh: async (ctx) => {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services['feature'].search(ctx.query);
    } else {
      entities = await strapi.services['feature'].find(ctx.query);
    }

    entities.map((entity) => strapi.services['feature'].refresh(entity));

    return entities.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models['feature'] })
    );
  },
};
