'use strict';

const { sanitizeEntity } = require('strapi-utils');

let event = {
  type: 'info',
  controller: 'concept-map',
};

module.exports = {
  process: async (ctx) => {
    const { id } = ctx.params;

    let entity = await strapi.services['concept-map'].process({ id });
    let entry = sanitizeEntity(entity, {
      model: strapi.models['concept-map'],
    });

    // log the event
    if (entry != null) {
      event.action = 'process';
      event.item = entry.name;
      if (typeof ctx.state.user !== 'undefined') event.user = ctx.state.user.id;
      strapi.services.helper.log(event);
    }

    return entry;
  },
};
