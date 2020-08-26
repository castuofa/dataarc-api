'use strict';

module.exports = async () => {
  if (process.env.SEED_DATA == 'true') strapi.services.helper.seed();
};
