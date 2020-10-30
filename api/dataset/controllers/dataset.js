'use strict';

const { sanitizeEntity } = require('strapi-utils');

const info = {
  name: 'dataset',
  field: 'name',
};

module.exports = {
  process: async (ctx) => {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services[info.name].search(ctx.query);
    } else {
      entities = await strapi.services[info.name].find(ctx.query);
    }
    entities.map((entity) => {
      // make sure the entity is not null
      if (entity != null) {
        // log the event
        strapi.services['event'].controller(info, entity, ctx);

        // run any pre process tasks
        strapi.services[info.name].beforeProcess(entity.id);

        // helper functions
        let process = async (data) => {
          let added = await strapi.services['feature']
            .add(entity.id, data)
            .catch((e) => {
              strapi.services['event'].controller(info, entity, ctx, {
                type: 'error',
                details: `Error creating feature ${e.message}`,
              });
            });
          let processed = await strapi.services['feature']
            .process(added)
            .catch((e) => {
              strapi.services['event'].controller(info, entity, ctx, {
                type: 'error',
                details: `Error processing feature ${e.message}`,
              });
            });
          let refreshed = await strapi.services['feature']
            .refresh(processed)
            .catch((e) => {
              strapi.services['event'].controller(info, entity, ctx, {
                type: 'error',
                details: `Error refreshing feature ${e.message}`,
              });
            });
          if (refreshed) {
            // console.log(`Feature loaded successfully`);
          }
        };
        let error = (e) => {
          strapi.services['event'].controller(info, entity, ctx, {
            type: 'error',
            details: e.message,
          });
          return ctx.response.badData(err.message);
        };
        let after = () => {
          strapi.services['event'].controller(info, entity, ctx);
          strapi.services[info.name].afterProcess(entity.id);
          console.log('after');
        };

        // stream and process the features
        strapi.services['helper'].getSource({
          source: entity.source,
          pattern: 'features.*',
          process,
          error,
          after,
        });
      }
    });

    return entities.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models[info.name] })
    );
  },

  refresh: async (ctx) => {
    const { id } = ctx.params;

    let entity;
    // try {
    //   entity = await strapi.services['dataset'].refresh({ id });
    // } catch (err) {
    //   event.type = 'error';
    //   event.action = 'refresh';
    //   event.item = id;
    //   event.details = err.message;
    //   if (typeof ctx.state.user !== 'undefined') event.user = ctx.state.user.id;
    //   strapi.services['event'].log(event);
    //   return ctx.response.badData(err.message);
    // }

    // let entry = sanitizeEntity(entity, {
    //   model: strapi.models['dataset'],
    // });

    // // log the event
    // if (entry != null) {
    //   event.action = 'refresh';
    //   event.item = entry.name;
    //   if (typeof ctx.state.user !== 'undefined') event.user = ctx.state.user.id;
    //   strapi.services['event'].log(event);
    // }

    return entry;
  },
};
