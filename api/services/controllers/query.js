'use strict';

const _ = require('lodash');
const turf = require('@turf/turf');
const { createReadStream } = require('fs');

module.exports = {
  filter: async (ctx) => {
    console.log('FILTER API!');
    let out = {
      query: {},
      facets: {},
      results: {
        features: [],
      },
      idList: [],
    };

    // get the filter
    const filter = ctx.request.body;
    if (!filter) return;
    out.query = filter;

    // print our filter
    strapi.log.info(`Filter:`);
    console.log(`${JSON.stringify(filter, null, 2)}`);

    // *** BUILD QUERY ***
    let params = {};
    let where = {};

    // check for simple values
    if (filter.size) params['_limit'] = filter.size;
    if (filter.page) params['_start'] = filter.page;
    if (filter.schemaId) where['dataset'] = filter.schemaId;

    // check array values
    if (_.isArray(filter.ids) && !_.isEmpty(filter.ids))
      where['id_in'] = filter.ids;
    if (_.isArray(filter.sources) && !_.isEmpty(filter.sources))
      where['dataset_in'] = filter.sources;
    if (_.isArray(filter.indicators) && !_.isEmpty(filter.indicators))
      where['combinators_in'] = filter.indicators;
    if (_.isArray(filter.keywords) && !_.isEmpty(filter.keywords))
      params['_q'] = filter.keywords.join(' ');
    if (_.isArray(filter.topicIds) && !_.isEmpty(filter.topicIds)) {
      // topicIds
    }

    // check for temporal
    if (filter.temporal) {
      if (filter.temporal.start) where['begin_gte'] = filter.temporal.start;
      if (filter.temporal.end) where['end_lte'] = filter.temporal.end;
      // if (filter.temporal.period)
      //   where['text_date_eq'] = filter.temporal.period;
    }

    // *spatial filter after the query below

    // add where as a param
    if (!_.isEmpty(where)) params['_where'] = where;

    strapi.log.info(`Params:`);
    console.log(`${JSON.stringify(params, null, 2)}`);

    // //// switch query to directly use mongoose
    // query the features
    const matched_features = await strapi.query('feature').search(params);

    // format as a geojson feature to match legacy api and get related info
    let collection = turf.featureCollection(
      _.map(matched_features, (feature) => {
        feature.data = feature.properties;
        delete feature.properties;
        delete feature.__v;
        delete feature._id;
        let item = {
          id: feature.id,
          geometry: {
            type: 'Point',
            coordinates: [feature.longitude, feature.latitude],
          },
          properties: feature,
        };
        if (!feature.latitude && !feature.longitude) item.geometry = null;
        return item;
      })
    );

    strapi.log.info(`${collection.features.length} features`);
    // check for spatial filter
    if (!_.isEmpty(filter.spatial)) {
      let bboxFilter =
        !_.isEmpty(filter.spatial.topLeft) &&
        !_.isEmpty(filter.spatial.bottomRight);
      let regionFilter = !_.isEmpty(filter.spatial.region);

      // if we have any type of spatial filter, remove features without coordinates
      if (bboxFilter || regionFilter) {
        collection.features = _.filter(collection.features, (feature) => {
          if (!_.isEmpty(feature.geometry)) {
            return turf.containsNumber(feature.geometry.coordinates);
          }
          return false;
        });
        strapi.log.info(
          `${collection.features.length} features after coord check`
        );
      }

      // filter by bounding box
      if (bboxFilter) {
        let bbox = turf.bboxPolygon(
          turf.bbox(
            turf.lineString([
              filter.spatial.topLeft,
              filter.spatial.bottomRight,
            ])
          )
        );
        try {
          collection = await turf.pointsWithinPolygon(collection, bbox);
        } catch (err) {
          console.log(err);
        }
        strapi.log.info(`${collection.features.length} features after bbox`);
      }

      // filter by region
      if (regionFilter) {
        // TODO: filter by region
        strapi.log.info(`${collection.features.length} features after region`);
      }
    }

    // *** FORMAT RESULTS ***

    // *** FACET COUNTS ***
    out.facets['category'] = _.countBy(
      collection.features,
      'properties.category'
    );
    out.facets['dataset'] = _.countBy(
      collection.features,
      'properties.dataset'
    );
    out.facets['region'] = _.countBy(
      collection.features,
      'properties.facets.region'
    );
    out.facets['country'] = _.countBy(
      collection.features,
      'properties.facets.country'
    );
    out.facets['decades'] = _.countBy(
      collection.features,
      'properties.facets.decades'
    );
    out.facets['centuries'] = _.countBy(
      collection.features,
      'properties.facets.centuries'
    );
    out.facets['millennia'] = _.countBy(
      collection.features,
      'properties.facets.millennia'
    );
    out.facets['concepts'] = _.countBy(
      collection.features,
      'properties.concepts'
    );
    out.facets['combinators'] = _.countBy(
      collection.features,
      'properties.combinators'
    );

    // idList
    out.idList = _.map(collection.features, 'id');

    // results.features
    out.results.features = collection.features;

    // results.features -- id only
    if (filter.idOnly) {
      // out.results.features = _.map(collection.features, (feature) => {
      //   return {
      //     id: feature.id,
      //   };
      // });
      delete out.results.features;
    }

    // results.features -- id and geometry
    if (filter.idAndMap) {
      out.results.features = _.map(collection.features, (feature) => {
        return {
          id: feature.id,
          geometry: feature.geometry,
        };
      });
    }

    return out;
  },
  features: async (ctx) => {
    let file = await strapi.services['query'].features();
    ctx.type = 'text/csv';
    return createReadStream(file);
  },
  timeline: async (ctx) => {
    return await strapi.services['query'].timeline();
  },
  concepts: async (ctx) => {
    return await strapi.services['query'].concepts();
  },
  results: async (ctx) => {},
  matched: async (ctx) => {},
  related: async (ctx) => {},
  contextual: async (ctx) => {},
};
