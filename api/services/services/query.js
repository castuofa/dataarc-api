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
    if (filter.keywords) {
      params['$text'] = {
        $search: filter.keywords,
      };
    }

    // check for bounding box
    if (filter.box) {
      params['location'] = {
        $geoWithin: {
          $box: filter.box,
        },
      };
    }

    // check for polygon
    if (filter.polygon) {
      params['location'] = {
        $geoWithin: {
          $polygon: filter.polygon,
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
    if (filter.spatial_coverages) {
      if (
        strapi.services['helper'].getType(filter.spatial_coverages) === 'string'
      )
        filter.spatial_coverages = [filter.spatial_coverages];
      params['spatial_coverages'] = {
        $all: _.map(filter.spatial_coverages, ObjectId),
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
    if (filter.temporal_coverages) {
      if (
        strapi.services['helper'].getType(filter.temporal_coverages) ===
        'string'
      )
        filter.temporal_coverages = [filter.temporal_coverages];
      params['temporal_coverages'] = {
        $all: _.map(filter.temporal_coverages, ObjectId),
      };
    }

    // check for concepts
    if (filter.concepts) {
      if (strapi.services['helper'].getType(filter.concepts) === 'string')
        filter.concepts = [filter.concepts];
      params['concepts'] = { $all: _.map(filter.concepts, ObjectId) };
    }

    // check for combinators
    if (filter.combinators) {
      if (strapi.services['helper'].getType(filter.combinators) === 'string')
        filter.combinators = [filter.combinators];
      params['combinators'] = { $all: _.map(filter.combinators, ObjectId) };
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
        let title = `"<b>${result._id.title.replace('"', '""')}</b><br>${
          result._id.dataset
        }<br>${result._id.category}"`;
        out.push(
          `${result._id.id},${result._id.coords[0]},${result._id.coords[1]},${result._id.color},${title}`
        );
      }
    });

    return out.join('\n');
  },

  // createFeaturesFile: async (path) => {
  //   let datasets = await strapi.query('dataset').find({ _limit: 999999999 });

  //   // get the points stored in the dataset
  //   let points = [];
  //   _.each(datasets, (dataset) => {
  //     if (dataset.map_points) {
  //       points = _.union(points, dataset.map_points);
  //     }
  //   });

  //   // convert to csv
  //   let csv = [];
  //   let keys = [];
  //   csv.push(`id,lon,lat,color`);
  //   _.each(_.compact(points), (point) => {
  //     if (_.indexOf(keys, point.id) == -1) {
  //       csv.push(`${point.id},${point.lon},${point.lat},${point.color}`);
  //       keys.push(point.id);
  //     }
  //   });

  //   // write the cache file
  //   await fs.writeFile(path, csv.join('\n'), 'utf8', function (err) {
  //     if (err) strapi.log.error(`Features file not saved or corrupted`);
  //   });
  // },

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

  matchedResults: async (params) => {
    const pipe = [
      {
        $match: params,
      },
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

  relatedResults: async (params) => {
    const pipe = [
      {
        $match: params,
      },
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

  contextualResults: async (params) => {
    const pipe = [
      {
        $match: params,
      },
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
};
