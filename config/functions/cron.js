'use strict';

/**
 * Cron config that gives you an opportunity
 * to run scheduled jobs.
 *
 * The cron format consists of:
 * [SECOND (optional)] [MINUTE] [HOUR] [DAY OF MONTH] [MONTH OF YEAR] [DAY OF WEEK]
 *
 * See more details here: https://strapi.io/documentation/v3.x/concepts/configurations.html#cron-tasks
 */

module.exports = {
  '*/1 * * * *': () => {
    console.log('1 minute later');
  },

  // check if concept-map needs to be processed
  // check if concept map needs to be activated
  // check if dataset needs to be processed
  // check if dataset needs refreshed
  // check if combinator needs refreshed
  // check if search results need to be generated
  // check if search results need to be deleted


  /**
   * Simple example.
   * Every monday at 1am.
   */
  // '0 1 * * 1': () => {
  //
  // }

};
