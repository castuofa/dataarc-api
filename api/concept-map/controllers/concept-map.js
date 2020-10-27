'use strict';

const { sanitizeEntity } = require('strapi-utils');

const info = {
  name: 'concept-map',
  field: 'name',
};

module.exports = {
  process: async (ctx) => {
    const { id } = ctx.params;
    const entity = await strapi.services[info.name].findOne({ id });

    // make sure the entity was found
    if (entity != null) {
      // log the event
      strapi.services.event.controller(info, entity, ctx);

      // remove existing topics
      strapi.services[info.name].remove_topics(entity);

      // helper functions
      let process = (data) => {
        strapi.services[info.name].process_node(entity, data);
        return data;
      };
      let error = (e) => {
        strapi.services.event.controller(info, entity, ctx, {
          type: 'error',
          details: e.message,
        });
        return ctx.response.badData(err.message);
      };

      // stream and process the nodes
      strapi.services.helper
        .stream_json({
          source: entity.source,
          pattern: 'nodes.*',
          process,
          error,
        })
        .catch((e) => error);
    }
    return sanitizeEntity(entity, { model: strapi.models[info.name] });
  },

  activate: async (ctx) => {
    const { id } = ctx.params;
    const entity = await strapi.services[info.name].findOne({ id });

    // make sure the entity was found
    if (entity != null) {
      // log the event
      strapi.services.event.controller(info, entity, ctx);

      // remove all existing links
      strapi.services[info.name].remove_links(entity);

      // helper functions
      let process = (data) => {
        strapi.services[info.name].process_edge(entity, data);
        return data;
      };
      let error = (e) => {
        strapi.services.event.controller(info, entity, ctx, {
          type: 'error',
          details: e.message,
        });
      };
      let after = () => {
        strapi.services[info.name].activate_map(entity);
      };

      // stream and process the nodes
      strapi.services.helper
        .stream_json({
          source: entity.source,
          pattern: 'links.*',
          process,
          error,
          after,
        })
        .catch((e) => {
          strapi.services.event.controller(info, entity, ctx, {
            type: 'error',
            details: e.message,
          });
        });
    }
    return sanitizeEntity(entity, { model: strapi.models[info.name] });
  },
};
