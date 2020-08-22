'use strict';

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
