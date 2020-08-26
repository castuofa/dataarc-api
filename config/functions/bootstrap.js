'use strict';

module.exports = async () => {
  if (process.env.SEED == 'true') strapi.services.helper.seed();
};
