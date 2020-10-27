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
        strapi.services[info.name].before_process(entity.id);

        // helper functions
        let process = (data) => {
          strapi.services['feature']
            .add(entity.id, data)
            .then((feature) => {
              strapi.services['feature']
                .process(feature)
                .then((feature) => {
                  strapi.services['feature']
                    .refresh(feature)
                    .then((feature) => {
                      strapi.log.debug(`Feature loaded successfully`);
                    })
                    .catch((error) => {
                      strapi.services['event'].controller(info, entity, ctx, {
                        type: 'error',
                        details: `Error refreshing feature ${e.message}`,
                      });
                    });
                })
                .catch((e) => {
                  strapi.services['event'].controller(info, entity, ctx, {
                    type: 'error',
                    details: `Error processing feature ${e.message}`,
                  });
                });
            })
            .catch((e) => {
              strapi.services['event'].controller(info, entity, ctx, {
                type: 'error',
                details: `Error creating feature ${e.message}`,
              });
            });

          return data;
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
          strapi.services[info.name].after_process(entity.id);
        };

        // stream and process the features
        strapi.services['helper']
          .stream_json({
            source: entity.source,
            pattern: 'features.*',
            process,
            error,
            after,
          })
          .catch((e) => error);
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
