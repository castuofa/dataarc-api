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
      strapi.services['event'].controller(info, entity, ctx);

      // process
      strapi.services['concept-map'].process(entity);
    }
    return sanitizeEntity(entity, { model: strapi.models[info.name] });
  },

  activate: async (ctx) => {
    const { id } = ctx.params;
    const entity = await strapi.services[info.name].findOne({ id });

    // make sure the entity was found
    if (entity != null) {
      // log the event
      strapi.services['event'].controller(info, entity, ctx);

      let edges = [];

      // helper functions
      let process = async (data) => {
        let edge = await strapi.services[info.name].processEdge(entity, data);
        if (edge) edges.push(edge);
        return data;
      };
      let error = (e) => {
        strapi.services['event'].controller(info, entity, ctx, {
          type: 'error',
          details: e.message,
        });
      };
      let after = () => {
        strapi.services[info.name].activateMap(entity, edges);
      };

      // stream and process the nodes
      strapi.services['helper']
        .getSource({
          source: entity.source,
          pattern: 'links.*',
          process,
          error,
          after,
        })
        .catch((e) => {
          strapi.services['event'].controller(info, entity, ctx, {
            type: 'error',
            details: e.message,
          });
        });
    }
    return sanitizeEntity(entity, { model: strapi.models[info.name] });
  },
};
