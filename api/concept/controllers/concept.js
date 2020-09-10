'use strict';

const _ = require('lodash');
const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  random: async (ctx) => {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services['concept'].search(ctx.query);
    } else {
      entities = await strapi.services['concept'].find(ctx.query);
    }
    return sanitizeEntity(entities[_.random(entities.length)], {
      model: strapi.models['concept'],
    });
  },
};
