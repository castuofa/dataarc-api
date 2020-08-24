'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
  process: async (ctx) => {
    const { id } = ctx.params;

    let entity = await strapi.services['topic-map'].process({ id });
    let entry = sanitizeEntity(entity, {
      model: strapi.models['topic-map'],
    });

    if (entry != null)
      strapi.services.helper.log_event(
        'process',
        'topic-map',
        entry.name,
        typeof ctx.state.user !== 'undefined' ? ctx.state.user.id : null
      );

    return entry;
  },
};
