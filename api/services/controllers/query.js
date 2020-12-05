'use strict';

const _ = require('lodash');
const fs = require('fs');

module.exports = {
  features: async (ctx) => {
    // return csv for plotly if get request
    if (ctx.request.method === 'GET') {
      // ctx.type = 'text/csv';
      // ctx.body = Readable.from(await strapi.services['query'].streamFeatures());

      let file = await strapi.services['query'].getFeatures();
      return fs.createReadStream(file);
    }

    // get the filters
    const filters = ctx.request.body;
    if (!filters) return;

    // get the type
    const type = filters.type || 'matched';
    if (type !== 'matched' && type !== 'related' && type !== 'contextual')
      return;

    // get the params
    const params = await strapi.services['query'].processFilters(filters);

    // get the results
    if (type === 'matched')
      return await strapi.services['query'].matchedFeatures(params);
    if (type === 'related')
      return await strapi.services['query'].relatedFeatures(params);
    if (type === 'contextual')
      return await strapi.services['query'].contextualFeatures(params);

    return;
  },

  timeline: async (ctx) => {
    // get the filters
    const filters = ctx.request.body;
    if (!filters) return;

    // get the timeline resolution
    const type = filters.type || 'millennia';
    if (type !== 'millennia' && type !== 'centuries' && type !== 'decades')
      return;

    // get the results type
    if (!Number.isInteger(filters.start)) return;
    const start = filters.start;

    // get the params
    const params = await strapi.services['query'].processFilters(filters);

    // get the results
    const results = await strapi.services['query'].filterTimeline(
      params,
      start,
      type
    );

    return results;
  },

  concepts: async (ctx) => {
    // return the csv file if request is GET
    if (ctx.request.method === 'GET') {
      return await strapi.services['query'].getConcepts();
    }

    // get the filters
    const filters = ctx.request.body;
    if (!filters) return;

    // get the type
    const type = filters.type || 'matched';
    if (type !== 'matched' && type !== 'related' && type !== 'contextual')
      return;

    // get the params
    const params = await strapi.services['query'].processFilters(filters);

    // get the concepts
    if (type === 'matched')
      return await strapi.services['query'].matchedConcepts(params);
    if (type === 'related')
      return await strapi.services['query'].relatedConcepts(params);
    if (type === 'contextual')
      return await strapi.services['query'].contextualConcepts(params);

    return;
  },

  results: async (ctx) => {
    // get the filters
    const filters = ctx.request.body;
    if (!filters) return;

    // get the type
    const type = filters.type || 'matched';
    if (type !== 'matched' && type !== 'related' && type !== 'contextual')
      return;

    // get the params
    const params = await strapi.services['query'].processFilters(filters);

    // get the results
    if (type === 'matched')
      return await strapi.services['query'].matchedResults(params);
    if (type === 'related')
      return await strapi.services['query'].relatedResults(params);
    if (type === 'contextual')
      return await strapi.services['query'].contextualResults(params);

    return;
  },
};
