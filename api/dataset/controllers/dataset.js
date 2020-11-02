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
    let promises = [];

    // make sure the entity was found
    if (entity != null) {
      // log the event
      strapi.services['event'].controller(info, entity, ctx);

      // helper functions
      let process = async (data) => {
        // add the feature
        let added = await strapi.services['feature']
          .add(entity.id, data)
          .catch((e) => {
            strapi.services['event'].controller(info, entity, ctx, {
              type: 'error',
              details: `Error creating feature ${e.message}`,
            });
          });
        // process the feature
        let processed = await strapi.services['feature']
          .process(added)
          .catch((e) => {
            strapi.services['event'].controller(info, entity, ctx, {
              type: 'error',
              details: `Error processing feature ${e.message}`,
            });
          });
        // refresh the feature
        promises.push(
          strapi.services['feature'].refresh(processed).catch((e) => {
            strapi.services['event'].controller(info, entity, ctx, {
              type: 'error',
              details: `Error refreshing feature ${e.message}`,
            });
          })
        );
      };
      let error = async (e) => {
        strapi.services['event'].controller(info, entity, ctx, {
          type: 'error',
          details: e.message,
        });
        return ctx.response.badData(err.message);
      };
      let after = async () => {
        // extract fields
        promises.push(strapi.services[info.name].extractFields(entity));

        // get the related spatial data
        promises.push(
          strapi.services[info.name].refreshFeaturesSpatial(entity.id)
        );

        // make sure all promises have been settled
        Promise.allSettled(promises).then((res) => {
          // set processed_at field
          strapi.services[info.name].setProcessedAt(entity.id, Date.now());
          strapi.log.debug(`Processing complete for ${entity.name}`);
        });
      };

      // clear processed_at field
      promises.push(strapi.services[info.name].setProcessedAt(entity.id, null));

      // remove existing features
      promises.push(strapi.services[info.name].removeFeatures(entity.id));

      // set existing fields to missing and mark for review
      promises.push(strapi.services[info.name].setFieldsMissing(entity.id));

      // stream and process the features
      strapi.services['helper'].getSource({
        source: entity.source,
        pattern: 'features.*',
        process,
        error,
        after,
      });
    }
    return sanitizeEntity(entity, { model: strapi.models[info.name] });
  },

  refresh: async (ctx) => {
    const { id } = ctx.params;
    const entity = await strapi.services[info.name].findOne({ id });

    // make sure the entity was found
    if (entity != null) {
      // log the event
      strapi.services['event'].controller(info, entity, ctx);

      // refresh the features
      strapi.services[info.name].refreshFeatures(entity.id);
    }
    return sanitizeEntity(entity, { model: strapi.models[info.name] });
  },
};
