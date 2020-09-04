'use strict';

/**
 * Bootstrap function, run every startup.
 * See https://strapi.io/documentation/v3.x/concepts/configurations.html#bootstrap
 */
module.exports = async () => {
  if (process.env.SEED_DATA == 'true') strapi.services.seeder.seed();
  return;
};
