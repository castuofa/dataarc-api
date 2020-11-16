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

    // get the filter
    const filter = ctx.request.body;
    if (!filter) return;

    // get the params
    const params = await strapi.services['query'].filterToParams(filter);

    // filter the features
    const results = await strapi.services['query'].filterFeatures(params);
    console.log(results.length);
    return results;
  },

  timeline: async (ctx) => {
    // get the filter
    const filter = ctx.request.body;
    if (!filter) return;

    // get the timeline resolution
    const type = filter.type || 'millennia';
    if (type !== 'millennia' && type !== 'centuries' && type !== 'decades')
      return;

    // get the results type
    if (!Number.isInteger(filter.start)) return;
    const start = filter.start;

    // get the params
    const params = await strapi.services['query'].filterToParams(filter);

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

    // get the filter
    const filter = ctx.request.body;
    if (!filter) return;

    // get the params
    const params = await strapi.services['query'].filterToParams(filter);

    // filter the concepts
    const results = await strapi.services['query'].filterConcepts(params);
    return results;
  },

  results: async (ctx) => {
    // get the filter
    const filter = ctx.request.body;
    if (!filter) return;

    // get the results type
    const type = filter.type || 'matched';
    if (type !== 'matched' && type !== 'related' && type !== 'contextual')
      return;

    // get the params
    const params = await strapi.services['query'].filterToParams(filter);

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
