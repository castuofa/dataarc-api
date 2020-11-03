'use strict';

const { createReadStream } = require('fs');
const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  features: async (ctx) => {
    let file = await strapi.services['query'].features();
    ctx.type = 'text/csv';
    return createReadStream(file);
  },
  timeline: async (ctx) => {
    return await strapi.services['query'].timeline();
  },
  concepts: async (ctx) => {
    return await strapi.services['query'].concepts();
  },
  results: async (ctx) => {},
  matched: async (ctx) => {},
  related: async (ctx) => {},
  contextual: async (ctx) => {},
};
