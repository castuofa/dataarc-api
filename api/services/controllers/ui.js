'use strict';

const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  features: async (ctx) => {
    return await strapi.services['query'].features();
  },
  timeline: async (ctx) => {
    return await strapi.services['query'].timeline();
  },
  concepts: async (ctx) => {
    return await strapi.services['query'].concepts();
  },
  matched: async (ctx) => {},
  related: async (ctx) => {},
  contextual: async (ctx) => {},
};
