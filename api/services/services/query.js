'use strict';

const _ = require('lodash');
const fs = require('fs');
const ObjectId = require('mongodb').ObjectID;

module.exports = {
  filterToParams: async (filter) => {
    // check the filter
    if (!filter) return;
    let params = {};

    // check for categories
    if (filter.category) {
      if (strapi.services['helper'].getType(filter.category) === 'string')
        filter.category = [filter.category];
      params['category'] = { $in: _.map(filter.category, ObjectId) };
    }

    // check for datasets
    if (filter.dataset) {
      if (strapi.services['helper'].getType(filter.dataset) === 'string')
        filter.dataset = [filter.dataset];
      params['dataset'] = { $in: _.map(filter.dataset, ObjectId) };
    }

    // check for keywords
    if (filter.keyword) {
      params['$text'] = {
        $search: filter.keyword,
      };
    }

    // check for bounding box
    if (filter.box) {
      let minX = filter.box[0][0];
      let maxX = filter.box[1][0];
      let minY = filter.box[1][1];
      let maxY = filter.box[0][1];
      params['location'] = {
        $geoWithin: {
          $box: [
            [minX, minY],
            [maxX, maxY],
          ],
        },
      };
    }

    // check for polygon
    if (filter.polygon) {
      let poly = filter.polygon;
      // close the polygon if we need to
      if (!_.isEqual(poly[0], poly[poly.length - 1])) poly.push(poly[0]);
      params['location'] = {
        $geoWithin: {
          $polygon: poly,
        },
      };
    }

    // check for circle
    if (filter.circle) {
      params['location'] = {
        $geoWithin: {
          $center: filter.circle,
        },
      };
    }

    // check for spatial_coverages
    if (filter.spatial_coverage) {
      if (
        strapi.services['helper'].getType(filter.spatial_coverage) === 'string'
      )
        filter.spatial_coverage = [filter.spatial_coverage];
      params['spatial_coverages'] = {
        $all: _.map(filter.spatial_coverage, ObjectId),
      };
    }

    // check for temporal
    if (filter.temporal && _.isArray(filter.temporal)) {
      _.each(filter.temporal, (period) => {
        if (period.begin) params['begin'] = { $gte: period.begin };
        if (period.end) params['end'] = { $lte: period.end };
      });
    }

    // check for temporal_coverages
    if (filter.temporal_coverage) {
      if (
        strapi.services['helper'].getType(filter.temporal_coverage) === 'string'
      )
        filter.temporal_coverage = [filter.temporal_coverage];
      params['temporal_coverages'] = {
        $all: _.map(filter.temporal_coverage, ObjectId),
      };
    }

    // check for concepts
    if (filter.concept) {
      if (strapi.services['helper'].getType(filter.concept) === 'string')
        filter.concept = [filter.concept];
      params['concepts'] = { $all: _.map(filter.concept, ObjectId) };
    }

    // check for combinators
    if (filter.combinator) {
      if (strapi.services['helper'].getType(filter.combinator) === 'string')
        filter.combinator = [filter.combinator];
      params['combinators'] = { $all: _.map(filter.combinator, ObjectId) };
    }

    return params;
  },

  aggregateCounts: async (field, params) => {
    params[field] = { $not: { $size: 0 } };
    const pipe = [
      {
        $match: params,
      },
      {
        $sortByCount: `$${field}`,
      },
    ];
    return strapi.query('feature').model.aggregate(pipe);
  },

  getFeatures: async () => {
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
    const results = await strapi.query('feature').model.aggregate(pipe);
    if (!results.length) return [];
    let out = [];
    out.push(`id,lon,lat,color,title`);
    _.each(results, (result) => {
      if (result._id.coords && result._id.coords.length) {
        let title = `"<b>${
          result._id.title ? result._id.title.replace('"', '""') : ''
        }</b><br>${result._id.dataset}<br>${result._id.category}"`;
        out.push(
          `${result._id.id},${result._id.coords[0]},${result._id.coords[1]},${result._id.color},${title}`
        );
      }
    });

    return out.join('\n');
  },

  filterFeatures: async (params) => {
    const pipe = [
      { $match: params },
      { $group: { _id: null, items: { $push: '$_id' } } },
      { $project: { items: true, _id: false } },
    ];
    const results = await strapi.query('feature').model.aggregate(pipe);
    if (!results.length) return [];
    return results.pop().items;
  },

  filterTimeline: async (params, start, resolution) => {
    const pipe = [
      { $match: params },
      {
        $group: {
          _id: {
            category_id: '$facets.category.id',
            category: '$facets.category.title',
            color: '$facets.category.color',
          },
          a: { $push: '$facets.decades' },
        },
      },
      { $unwind: '$a' },
      { $unwind: '$a' },
      {
        $group: {
          _id: {
            category: '$_id',
            item: '$a',
          },
          itemCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.category',
          items: {
            $push: { period: '$_id.item', count: '$itemCount' },
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

  getConcepts: async () => {
    let map = await strapi.query('concept-map').findOne({ active: true });
    let concepts = {
      nodes: map.nodes,
      edges: map.edges,
    };
    return concepts;
  },

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
      { $match: params },
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
      { $match: params },
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
      { $match: params },
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
      related: { $in: _.map(concepts, ObjectId) },
    });

    // get the matched features
    let matched = await strapi.services['query'].filterFeatures(params);

    // include combined concepts
    params['concepts'] = { $in: _.map(_.union(concepts, related), ObjectId) };

    // eclude features that matched
    params['_id'] = { $nin: _.map(matched, ObjectId) };

    return await strapi.services['query'].filterFeatures(params);
  },

  // array of contextual feature ids
  contextualFeatures: async (params) => {
    // get the matched concepts
    let concepts = await strapi.services['query'].matchedConcepts(params);

    // get the contextual concepts
    let contextual = await strapi.services['query'].contextualConcepts({
      contextual: { $in: _.map(concepts, ObjectId) },
    });

    // get the matched features
    let matched = await strapi.services['query'].matchedFeatures(params);

    // get the related features
    let related = await strapi.services['query'].relatedFeatures(params);

    // include contextual concepts
    params['concepts'] = { $in: _.map(contextual, ObjectId) };

    // eclude features that matched
    params['_id'] = {
      $nin: _.map(_.union(matched, related), ObjectId),
    };

    return await strapi.services['query'].filterFeatures(params);
  },

  // get result counts that match the filter
  matchedResults: async (params) => {
    const pipe = [
      { $match: params },
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

    // only include related features
    params['_id'] = { $in: _.map(features, ObjectId) };
    return await strapi.services['query'].matchedResults(params);
  },

  // get result counts that are contextual
  contextualResults: async (params) => {
    // get the matched features
    let features = await strapi.services['query'].contextualFeatures(params);

    // only include related features
    params['_id'] = { $in: _.map(features, ObjectId) };
    return await strapi.services['query'].matchedResults(params);
  },
};
