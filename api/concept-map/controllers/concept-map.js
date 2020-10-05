'use strict';

const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  process: async (ctx) => {
    const { id } = ctx.params;

    let entity = await strapi.services['concept-map'].process({ id });
    let entry = sanitizeEntity(entity, {
      model: strapi.models['concept-map'],
    });

    if (entry != null)
      strapi.services.helper.log_event(
        'process',
        'concept-map',
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },
};
