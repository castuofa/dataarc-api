'use strict';

const _ = require('lodash');

module.exports = {
  filter: async (filter) => {
    console.log(filter);
  },
  features: async () => {
    let datasets = await strapi.query('dataset').find({ _limit: 999999999 });

    // get the points stored in the dataset
    let points = [];
    _.each(datasets, (dataset) => {
      if (dataset.map_points) {
        points = _.union(points, dataset.map_points);
      }
    });

    // convert to csv
    let csv = [];
    let keys = [];
    csv.push(`id,lng,lat`);
    _.each(_.compact(points), (point) => {
      if (_.indexOf(keys, point.id) == -1) {
        csv.push(`${point.id},${point.lng},${point.lat}`);
        keys.push(point.id);
      }
    });

    return csv.join('\n');
  },
  timeline: async () => {},
  concepts: async () => {
    let map = await strapi.query('concept-map').findOne({ active: true });
    let concepts = {
      nodes: map.nodes,
      edges: map.edges,
    };
    return concepts;
  },
};
