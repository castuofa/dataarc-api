'use strict';

const _ = require('lodash');
const fs = require('fs');
const ObjectId = require('mongodb').ObjectID;
const { sanitizeEntity } = require('strapi-utils');

module.exports = {
  // convert filters to params
  filtersToParams: async (filters) => {
    // check the filters
    if (!filters) return;
    let params = [];

    // check for keywords *THIS SHOULD BE FIRST
    if (filters.keyword) {
      params.push({ $text: { $search: filters.keyword } });
    }

    // check for bounding box
    if (filters.box) {
      let minX = filters.box[0][0];
      let maxX = filters.box[1][0];
      let minY = filters.box[1][1];
      let maxY = filters.box[0][1];
      params.push({
        location: {
          $geoWithin: {
            $box: [
              [minX, minY],
              [maxX, maxY],
            ],
          },
        },
      });
    }

    // check for polygon
    if (filters.polygon) {
      let poly = filters.polygon;
      // close the polygon if we need to
      if (!_.isEqual(poly[0], poly[poly.length - 1])) poly.push(poly[0]);
      params.push({
        location: {
          $geoWithin: {
            $polygon: poly,
          },
        },
      });
    }

    // check for circle
    if (filters.circle) {
      params.push({
        location: {
          $geoWithin: {
            $center: filters.circle,
          },
        },
      });
    }

    // check for temporal
    if (filters.temporal && _.isArray(filters.temporal)) {
      _.each(filters.temporal, (period) => {
        if (Number.isInteger(period.begin) && Number.isInteger(period.end)) {
          params.push({
            $and: [
              { begin: { $lt: period.end } },
              { end: { $gt: period.begin } },
            ],
          });
        } else {
          if (Number.isInteger(period.begin)) {
            params.push({
              end: { $gt: period.begin },
            });
          }
          if (Number.isInteger(period.end)) {
            params.push({
              begin: { $lt: period.end },
            });
          }
        }
      });
    }

    // check for categories
    if (filters.category) {
      if (strapi.services['helper'].getType(filters.category) === 'string')
        filters.category = [filters.category];
      params.push({ category: { $in: _.map(filters.category, ObjectId) } });
    }

    // check for datasets
    if (filters.dataset) {
      if (strapi.services['helper'].getType(filters.dataset) === 'string')
        filters.dataset = [filters.dataset];
      params.push({ dataset: { $in: _.map(filters.dataset, ObjectId) } });
    }

    // check for spatial_coverages
    if (filters.spatial_coverage) {
      if (
        strapi.services['helper'].getType(filters.spatial_coverage) === 'string'
      )
        filters.spatial_coverage = [filters.spatial_coverage];
      params.push({
        spatial_coverage: {
          $in: _.map(filters.spatial_coverage, ObjectId),
        },
      });
    }

    // check for temporal_coverages
    if (filters.temporal_coverage) {
      if (
        strapi.services['helper'].getType(filters.temporal_coverage) ===
        'string'
      )
        filters.temporal_coverage = [filters.temporal_coverage];
      params.push({
        temporal_coverages: {
          $in: _.map(filters.temporal_coverage, ObjectId),
        },
      });
    }

    // check for concepts
    if (filters.concept) {
      if (strapi.services['helper'].getType(filters.concept) === 'string')
        filters.concept = [filters.concept];
      let ids = await strapi.services['query'].getIdsUnwind(
        'combinator',
        [{ concepts: { $in: _.map(filters.concept, ObjectId) } }],
        'features'
      );
      params.push({
        _id: { $in: _.map(ids, ObjectId) },
      });
    }

    // check for combinators
    if (filters.combinator) {
      if (strapi.services['helper'].getType(filters.combinator) === 'string')
        filters.combinator = [filters.combinator];
      let ids = await strapi.services['query'].getIdsUnwind(
        'combinator',
        [{ _id: { $in: _.map(filters.combinator, ObjectId) } }],
        'features'
      );
      params.push({
        _id: { $in: _.map(ids, ObjectId) },
      });
    }

    return params;
  },

  // convert filters to params object
  filtersToParamsObject: (filters) => {
    let params = strapi.services['query'].filtersToParams(filters);
    return joinParams(params);
  },

  // get array of ids matching given params for a given collection
  getIds: async (collection, params) => {
    const pipe = [
      { $match: joinParams(params) },
      { $group: { _id: null, ids: { $addToSet: '$_id' } } },
      { $project: { ids: true, _id: false } },
    ];
    const results = await strapi.query(collection).model.aggregate(pipe);
    if (!results.length) return [];
    return _.map(results.pop().ids, String);
  },

  // get array od documents matching given params for a given collection
  getDocs: async (collection, params) => {
    const pipe = [{ $match: joinParams(params) }];
    const results = await strapi.query(collection).model.aggregate(pipe);
    if (!results.length) return [];
    return results;
  },

  // get feature ids by concepts
  getIdsUnwind: async (collection, params, unwind) => {
    const pipe = [
      { $match: joinParams(params) },
      { $unwind: `$${unwind}` },
      { $unwind: `$${unwind}` },
      { $group: { _id: null, ids: { $addToSet: `$${unwind}` } } },
      { $project: { ids: true, _id: false } },
    ];
    const results = await strapi.query(collection).model.aggregate(pipe);
    if (!results.length) return [];
    return _.map(results.pop().ids, String);
  },

  // query to get all of the featurs and create the csv cache file
  refreshFeaturesCache: async (file) => {
    const dir = `${strapi.dir}/public/cache`;
    const transform = (feature) => {
      let doc = feature._id;
      if (doc && doc.coords && doc.coords.length) {
        let text = ``;
        if (doc.title) text += `<b>${_.truncate(doc.title)}</b><br>`;
        if (doc.dataset) text += `${doc.dataset}<br>`;
        if (doc.category) text += `${doc.category}`;
        let id = doc.id;
        let lon = doc.coords[0];
        let lat = doc.coords[1];
        let color = doc.color || '#222222';
        return `${id},${lon},${lat},${color},${text}`;
      }
    };
    const pipe = [
      {
        $group: {
          _id: {
            category: '$facets.category.title',
            color: '$facets.category.color',
            dataset: '$facets.dataset.title',
            id: '$_id',
            title: '$title',
            coords: '$location.coordinates',
          },
        },
      },
    ];

    // get the results
    const results = await strapi.query('feature').model.aggregate(pipe);

    // check to see if the cache dir exists, create it
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    // write the cache file
    await fs.writeFile(
      file,
      ['id,lon,lat,color,text', ..._.map(results, transform)].join('\n'),
      'utf8',
      (err) => {
        if (err) strapi.log.error(`Features file not saved or corrupted`);
      }
    );

    return file;
  },

  // get the features file and refresh
  getFeatures: async () => {
    const dir = `${strapi.dir}/public/cache`;
    const file = `${dir}/features.csv`;

    // if file exists, return immediately and fire refresh
    if (fs.existsSync(file)) {
      strapi.services['query'].refreshFeaturesCache(file);
      return file;
    }

    // if it doesnt exist, refresh the file then return
    return await strapi.services['query'].refreshFeaturesCache(file);
  },

  // get id list of combinators
  filterCombinators: async (params) => {
    const pipe = [
      { $match: joinParams(params) },
      { $group: { _id: null, items: { $push: '$_id' } } },
      { $project: { items: true, _id: false } },
    ];
    const results = await strapi.query('combinator').model.aggregate(pipe);
    if (!results.length) return [];
    return results.pop().items;
  },

  // get counts for the timeline
  filterTimeline: async (params, start, resolution) => {
    const pipe = [
      { $match: joinParams(params) },
      {
        $group: {
          _id: {
            category_id: '$facets.category.id',
            category: '$facets.category.title',
            color: '$facets.category.color',
          },
          periods: { $push: '$facets.' + resolution },
        },
      },
      { $unwind: '$periods' },
      { $unwind: '$periods' },
      {
        $group: {
          _id: {
            category: '$_id',
            period: '$periods',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.category',
          items: {
            $push: { period: '$_id.period', count: '$count' },
          },
        },
      },
      { $sort: { '_id.category': 1 } },
    ];
    const results = await strapi.query('feature').model.aggregate(pipe);

    let increment = 1000;
    if (resolution === 'millennia') increment = 1000;
    if (resolution === 'centuries') increment = 100;
    if (resolution === 'decades') increment = 10;
    let end = start + increment * 10;
    let range = _.range(start, end, increment);
    let out = [];
    _.each(results, (result) => {
      if (result._id.category) {
        let periods = [];
        _.each(range, (period) => {
          let val = _.find(result.items, { period: period });
          if (!val) val = { period: period, count: 0 };
          periods.push(val);
        });
        out.push({
          category: result._id.category,
          category_id: result._id.category_id,
          color: result._id.color,
          total: result.total,
          periods: _.map(periods, 'period'),
          counts: _.map(periods, 'count'),
        });
      }
    });

    return out;
  },

  // get concepts
  getConcepts: async () => {
    let map = await strapi.query('concept-map').findOne({ active: true });
    let concepts = {
      nodes: map.nodes,
      edges: map.edges,
    };
    return concepts;
  },

  // get filtered concepts
  filterConcepts: async (params) => {
    const pipe = [
      { $project: { a: '$concepts' } },
      { $unwind: '$a' },
      { $unwind: '$a' },
      { $group: { _id: 'a', items: { $addToSet: '$a' } } },
      { $project: { items: true, _id: false } },
    ];
    const results = await strapi.query('feature').model.aggregate(pipe);
    if (!results.length) return [];
    return results.pop().items;
  },

  // get concepts associated with records that match the filter
  matchedConcepts: async (params) => {
    // get the features
    const features = await strapi.services['query'].matchedFeatures(params);

    // get the combinators
    const combinators = await strapi.services['query'].getIds('combinator', [
      {
        features: { $in: _.map(features, ObjectId) },
      },
    ]);

    // get the concepts
    return strapi.services['query'].getIdsUnwind(
      'combinator',
      [
        {
          _id: { $in: _.map(combinators, ObjectId) },
        },
      ],
      'concepts'
    );
  },

  // get related concepts that match params
  relatedConcepts: async (params) => {
    // get the matched concepts
    const matched = await strapi.services['query'].matchedConcepts(params);

    // get the related concepts
    const related = await strapi.services['query'].getIdsUnwind(
      'concept',
      [
        {
          _id: { $in: _.map(matched, ObjectId) },
        },
      ],
      'related'
    );
    return _.difference(related, matched);
  },

  // get contextual concepts that match params
  contextualConcepts: async (params) => {
    // get the matched concepts
    const matched = await strapi.services['query'].matchedConcepts(params);

    // get the related concepts
    const related = await strapi.services['query'].getIdsUnwind(
      'concept',
      [
        {
          _id: { $in: _.map(matched, ObjectId) },
        },
      ],
      'related'
    );
    let filtered = _.difference(related, matched);

    // get the related concepts
    const contextual = await strapi.services['query'].getIdsUnwind(
      'concept',
      [
        {
          _id: { $in: _.map(matched, ObjectId) },
        },
      ],
      'contextual'
    );
    return _.difference(contextual, filtered);
  },

  // array of matched feature ids
  matchedFeatures: async (params) => {
    return strapi.services['query'].getIds('feature', params);
  },

  // array of related feature ids
  relatedFeatures: async (params) => {
    // get the matched features
    const features = await strapi.services['query'].matchedFeatures(params);

    // get the related concepts
    // const matched = await strapi.services['query'].matchedConcepts(params);
    const concepts = await strapi.services['query'].relatedConcepts(params);

    // include combined concepts
    let ids = await strapi.services['query'].getIdsUnwind(
      'combinator',
      [{ concepts: { $in: _.map(concepts, ObjectId) } }],
      'features'
    );

    // exclude matched features
    ids = _.difference(ids, features);

    return strapi.services['query'].getIds('feature', [
      {
        _id: { $in: _.map(ids, ObjectId) },
      },
    ]);
  },

  // array of contextual feature ids
  contextualFeatures: async (params) => {
    // get the matched and related features
    const matched = await strapi.services['query'].matchedFeatures(params);
    const related = await strapi.services['query'].relatedFeatures(params);

    // get the contextual concepts
    const concepts = await strapi.services['query'].contextualConcepts(params);

    // include combined concepts
    let ids = await strapi.services['query'].getIdsUnwind(
      'combinator',
      [{ concepts: { $in: _.map(concepts, ObjectId) } }],
      'features'
    );

    // exclude matched features
    ids = _.difference(ids, matched, related);

    return strapi.services['query'].getIds('feature', [
      {
        _id: { $in: _.map(ids, ObjectId) },
      },
    ]);
  },

  // get result counts that match the filter
  matchedResults: async (params) => {
    const pipe = [
      { $match: joinParams(params) },
      {
        $group: {
          _id: {
            category_id: '$facets.category.id',
            category: '$facets.category.title',
            dataset_id: '$facets.dataset.id',
            dataset: '$facets.dataset.title',
          },
          total: {
            $sum: 1,
          },
        },
      },
      {
        $group: {
          _id: {
            category_id: '$_id.category_id',
            category: '$_id.category',
          },
          total: {
            $sum: '$total',
          },
          datasets: {
            $push: {
              dataset_id: '$_id.dataset_id',
              dataset: '$_id.dataset',
              total: '$total',
            },
          },
        },
      },
      { $sort: { category: 1 } },
    ];
    const results = await strapi.query('feature').model.aggregate(pipe);
    let out = [];
    _.each(results, (result) => {
      if (result._id.category_id)
        out.push({
          category: result._id.category,
          category_id: result._id.category_id,
          total: result.total,
          datasets: result.datasets,
        });
    });
    return out;
  },

  // get result counts that are related
  relatedResults: async (params) => {
    // get the matched features
    let features = await strapi.services['query'].relatedFeatures(params);

    let related_params = [];
    // only include related features
    related_params.push({
      _id: { $in: _.map(features, ObjectId) },
    });
    return await strapi.services['query'].matchedResults(related_params);
  },

  // get result counts that are contextual
  contextualResults: async (params) => {
    // get the matched features
    let features = await strapi.services['query'].contextualFeatures(params);

    let contextual_params = [];
    // only include related features
    contextual_params.push({
      _id: { $in: _.map(features, ObjectId) },
    });

    return await strapi.services['query'].matchedResults(contextual_params);
  },

  // get the matched combinators
  matchedCombinators: async (params) => {
    // get the features
    const features = await strapi.services['query'].matchedFeatures(params);

    // get the combinators
    return strapi.services['query'].getIds('combinator', [
      {
        features: { $in: _.map(features, ObjectId) },
      },
    ]);
  },

  // get the search results export
  exportResults: async (filters) => {
    let results = {};
    results.filters = filters;

    // get the params
    const params = await strapi.services['query'].filtersToParams(filters);

    // get the matched feature docs
    const featureIds = await strapi.services['query'].matchedFeatures(params);
    const features = await strapi.services['query'].getDocs('feature', [
      { _id: { $in: _.map(featureIds, ObjectId) } },
    ]);

    // get matched concept docs
    const conceptIds = await strapi.services['query'].matchedConcepts(params);
    const concepts = await strapi.services['query'].getDocs('concept', [
      { _id: { $in: _.map(conceptIds, ObjectId) } },
    ]);

    // get matched combinator docs
    const combinatorIds = await strapi.services['query'].matchedCombinators(
      params
    );
    const combinators = await strapi.services['query'].getDocs('combinator', [
      { _id: { $in: _.map(combinatorIds, ObjectId) } },
    ]);

    // santitize the results
    results.features = features.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models['feature'] })
    );
    results.concepts = concepts.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models['concept'] })
    );
    results.combinators = combinators.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models['combinator'] })
    );

    return results;
  },
};

// helper function to join the params
const joinParams = (params, op) => {
  op = op || '$and';
  if (!params.length) return {};
  let query = {};
  query[op] = params;
  return query;
};
