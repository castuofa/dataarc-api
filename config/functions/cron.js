'use strict';

let running = false;

module.exports = {
  '*/1 * * * *': async () => {
    // make sure only one instance is running to avoid conflicts
    if (!running) {
      running = true;

      try {
        // remove expired searches
        await strapi.services['search'].removeExpired();

        // process search first to get results they expect
        await strapi.services['search'].exportResults();

        // process concept map
        // await strapi.services['concept-map'].
        // await strapi.services['concept-map'].process();

        // process datasets that are queued
        await strapi.services['dataset'].processDatasets();

        // refresh datasets that are queued
        await strapi.services['dataset'].refreshFeatures();

        // refresh combinators
        await strapi.services['combinator'].refreshQuery();

        // clean up relations
      } catch (err) {
        strapi.log.error(err.message);
      }
      running = false;
    }
  },
};
