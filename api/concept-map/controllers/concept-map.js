'use strict';

const { sanitizeEntity } = require('strapi-utils');

const info = {
  name: 'concept-map',
  field: 'name',
};

module.exports = {
  process: async (ctx) => {
    const { id } = ctx.params;
    const entity = await strapi.services['concept-map'].findOne({ id });

    // make sure the entity was found
    if (entity != null) {
      // log the event
      strapi.services.event.info({ info, ctx });

      // remove existing topics
      strapi.services['concept-map'].remove_topics(entity);

      // helper functions
      let process = (data) => {
        strapi.services['concept-map'].process_node(entity, data);
        return data;
      };
      let error = (e) => {
        strapi.services.event.error({ info, ctx, details: e.message });
      };

      // stream and process the nodes
      strapi.services.helper
        .stream_json({
          source: entity.source,
          pattern: 'nodes.*',
          process,
          error,
        })
        .catch((e) => {
          strapi.services.event.error({ info, ctx, details: e.message });
        });
    }
    return sanitizeEntity(entity, { model: strapi.models['concept-map'] });
  },

  activate: async (ctx) => {
    const { id } = ctx.params;
    const entity = await strapi.services['concept-map'].findOne({ id });

    // make sure the entity was found
    if (entity != null) {
      // log the event
      strapi.services.event.info({ info, ctx });

      // remove all existing links
      strapi.services['concept-map'].remove_links(entity);

      // helper functions
      let process = (data) => {
        strapi.services['concept-map'].process_edge(entity, data);
        return data;
      };
      let error = (e) => {
        strapi.services.event.error({ info, ctx, details: e.message });
      };
      let after = () => {
        strapi.services['concept-map'].activate_map(entity);
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
          strapi.services.event.error({ info, ctx, details: e.message });
        });
    }
    return sanitizeEntity(entity, { model: strapi.models['concept-map'] });
  },
};
