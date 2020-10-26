'use strict';

const { sanitizeEntity } = require('strapi-utils');

const info = {
  name: 'dataset',
  field: 'name',
};

module.exports = {
  process: async (ctx) => {
    const { id } = ctx.params;
    const entity = await strapi.services[info.name].findOne({ id });

    // make sure the entity was found
    if (entity != null) {
      // log the event
      strapi.services.event.info({ info, ctx, details: 'Processing started' });

      // remove existing topics and clear processed_at
      strapi.services[info.name].remove_features(entity);
      strapi.services[info.name].clear_processed_at(entity);

      // helper functions
      let process = (data) => {
        strapi.services[info.name].process_feature(entity, data);
        return data;
      };
      let error = (e) => {
        strapi.services.event.error({ info, ctx, details: e.message });
        return ctx.response.badData(err.message);
      };
      let after = () => {
        strapi.services.event.info({
          info,
          ctx,
          details: 'Processing complete',
        });
        strapi.services[info.name].set_processed_at(entity);
      };

      // stream and process the features
      strapi.services.helper
        .stream_json({
          source: entity.source,
          pattern: 'features.*',
          process,
          error,
          after,
        })
        .catch((e) => error);
    }
    return sanitizeEntity(entity, { model: strapi.models[info.name] });
  },

  refresh: async (ctx) => {
    const { id } = ctx.params;

    let entity;
    try {
      entity = await strapi.services['dataset'].refresh({ id });
    } catch (err) {
      event.type = 'error';
      event.action = 'refresh';
      event.item = id;
      event.details = err.message;
      if (typeof ctx.state.user !== 'undefined') event.user = ctx.state.user.id;
      strapi.services.event.log(event);
      return ctx.response.badData(err.message);
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['dataset'],
    });

    // log the event
    if (entry != null) {
      event.action = 'refresh';
      event.item = entry.name;
      if (typeof ctx.state.user !== 'undefined') event.user = ctx.state.user.id;
      strapi.services.event.log(event);
    }

    return entry;
  },
};
