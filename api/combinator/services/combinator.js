'use strict';

module.exports = {
  results: async (params) => {
    // find the entry
    const entry = await strapi.query('combinator').findOne(params);

    // only proceed if we found an entry
    if (entry != null) {
      // refresh the entry
    }

    return entry;
  },

  refresh: async (params) => {
    // find the entry
    const entry = await strapi.query('combinator').findOne(params);

    // only proceed if we found an entry
    if (entry != null) {
      // refresh the entry
    }

    return entry;
  },
};
