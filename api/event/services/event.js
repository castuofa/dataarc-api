'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
  log: (action, item, name, user, details = '') => {
    strapi.services.event.create({
      name: name,
      item: item,
      action: action,
      details: details,
      user: user,
    });
  },
};
