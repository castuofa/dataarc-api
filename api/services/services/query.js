'use strict';

const _ = require('lodash');
const fs = require('fs');
const ObjectId = require('mongodb').ObjectID;

module.exports = {
  filterToParams: (filter) => {
    // check the filter
    if (!filter) return;
    let params = [];

    // check for keywords *THIS SHOULD BE FIRST
    if (filter.keyword) {
      params.push({ $text: { $search: filter.keyword } });
    }

    // check for bounding box
    if (filter.box) {
      let minX = filter.box[0][0];
      let maxX = filter.box[1][0];
      let minY = filter.box[1][1];
      let maxY = filter.box[0][1];
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
    if (filter.polygon) {
      let poly = filter.polygon;
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
    if (filter.circle) {
      params.push({
        location: {
          $geoWithin: {
            $center: filter.circle,
          },
        },
      });
    }

    // check for temporal
    if (filter.temporal && _.isArray(filter.temporal)) {
      _.each(filter.temporal, (period) => {
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
    if (filter.category) {
      if (strapi.services['helper'].getType(filter.category) === 'string')
        filter.category = [filter.category];
      params.push({ category: { $in: _.map(filter.category, ObjectId) } });
    }

    // check for datasets
    if (filter.dataset) {
      if (strapi.services['helper'].getType(filter.dataset) === 'string')
        filter.dataset = [filter.dataset];
      params.push({ dataset: { $in: _.map(filter.dataset, ObjectId) } });
    }

    // check for spatial_coverages
    if (filter.spatial_coverage) {
      if (
        strapi.services['helper'].getType(filter.spatial_coverage) === 'string'
      )
        filter.spatial_coverage = [filter.spatial_coverage];
      params.push({
        spatial_coverage: {
          $all: _.map(filter.spatial_coverage, ObjectId),
        },
      });
    }

    // check for temporal_coverages
    if (filter.temporal_coverage) {
      if (
        strapi.services['helper'].getType(filter.temporal_coverage) === 'string'
      )
        filter.temporal_coverage = [filter.temporal_coverage];
      params.push({
        temporal_coverages: {
          $all: _.map(filter.temporal_coverage, ObjectId),
        },
      });
    }

    // check for concepts
    if (filter.concept) {
      if (strapi.services['helper'].getType(filter.concept) === 'string')
        filter.concept = [filter.concept];
      params.push({
        concepts: { $all: _.map(filter.concept, ObjectId) },
      });
    }

    // check for combinators
    if (filter.combinator) {
      if (strapi.services['helper'].getType(filter.combinator) === 'string')
        filter.combinator = [filter.combinator];
      params.push({
        combinators: { $all: _.map(filter.combinator, ObjectId) },
      });
    }

    return params;
  },

  filterToParamsObject: (filter) => {
    let params = strapi.services['query'].filterToParams(filter);
    return joinParams(params);
  },

  aggregateCounts: async (field, params) => {
    params.push({ field: { $not: { $size: 0 } } });
    const pipe = [
      {
        $match: joinParams(params),
      },
      {
        $sortByCount: `$${field}`,
      },
    ];
    return strapi.query('feature').model.aggregate(pipe);
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

  // get id list of features
  filterFeatures: async (params) => {
    const pipe = [
      { $match: joinParams(params) },
      { $group: { _id: null, items: { $push: '$_id' } } },
      { $project: { items: true, _id: false } },
    ];
    const results = await strapi.query('feature').model.aggregate(pipe);
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
    const pipe = [
      { $match: joinParams(params) },
      { $group: { _id: null, a: { $push: '$concepts' } } },
      { $unwind: '$a' },
      { $unwind: '$a' },
      { $group: { _id: '$a' } },
      { $group: { _id: null, matched: { $push: '$_id' } } },
    ];
    let matched = await strapi.query('feature').model.aggregate(pipe);
    matched = !matched.length ? [] : matched.pop().matched;
    return matched;
  },

  // get related concepts that match params
  relatedConcepts: async (params) => {
    const pipe = [
      { $match: joinParams(params) },
      { $unwind: '$related' },
      { $unwind: '$related' },
      { $group: { _id: '$related' } },
      { $group: { _id: null, related: { $push: '$_id' } } },
    ];
    let related = await strapi.query('concept').model.aggregate(pipe);
    related = !related.length ? [] : related.pop().related;
    return related;
  },

  // get contextual concepts that match params
  contextualConcepts: async (params) => {
    const pipe = [
      { $match: joinParams(params) },
      { $unwind: '$contextual' },
      { $unwind: '$contextual' },
      { $group: { _id: '$contextual' } },
      { $group: { _id: null, contextual: { $push: '$_id' } } },
    ];
    let contextual = await strapi.query('concept').model.aggregate(pipe);
    contextual = !contextual.length ? [] : contextual.pop().contextual;
    return contextual;
  },

  // array of matched feature ids
  matchedFeatures: async (params) => {
    return await strapi.services['query'].filterFeatures(params);
  },

  // array of related feature ids
  relatedFeatures: async (params) => {
    // get the matched concepts
    let concepts = await strapi.services['query'].matchedConcepts(params);

    // get the related concepts
    let related = await strapi.services['query'].relatedConcepts({
      id: { $in: _.map(concepts, ObjectId) },
    });

    // get the matched features
    let matched = await strapi.services['query'].filterFeatures(params);

    let related_params = [];
    // include combined concepts
    related_params.push({
      concepts: { $in: _.map(_.union(concepts, related), ObjectId) },
    });

    // eclude features that matched
    related_params.push({
      _id: { $nin: _.map(matched, ObjectId) },
    });

    return await strapi.services['query'].filterFeatures(related_params);
  },

  // array of contextual feature ids
  contextualFeatures: async (params) => {
    // get the matched concepts
    let concepts = await strapi.services['query'].matchedConcepts(params);

    // get the contextual concepts
    let contextual = await strapi.services['query'].contextualConcepts({
      id: { $in: _.map(concepts, ObjectId) },
    });

    // get the matched features
    let matched = await strapi.services['query'].matchedFeatures(params);

    // get the related features
    let related = await strapi.services['query'].relatedFeatures(params);

    let contextual_params = [];
    // include contextual concepts
    contextual_params.push({
      concepts: { $in: _.map(contextual, ObjectId) },
    });

    // eclude features that matched
    contextual_params.push({
      _id: { $nin: _.map(_.union(matched, related), ObjectId) },
    });

    return await strapi.services['query'].filterFeatures(contextual_params);
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
};

const joinParams = (params, op) => {
  op = op || '$and';
  if (!params.length) return {};
  let query = {};
  query[op] = params;
  return query;
};
