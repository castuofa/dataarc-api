'use strict';

const _ = require('lodash');
const fs = require('fs');

module.exports = {
  filter: async (filter) => {
    console.log(filter);
  },
  features: async () => {
    let dir = `${strapi.dir}/public/cache`;
    let file = `${dir}/features.csv`;

    // check to see if the cache dir exists, create it
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    // if file exists, return immediately and fire refresh
    if (fs.existsSync(file)) {
      strapi.services['query'].createFeaturesFile(file);
      return file;
    }

    // if the file doesn't exist, wait for it to be created
    await strapi.services['query'].createFeaturesFile(file);

    return file;
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
  results: async () => {},
  createFeaturesFile: async (path) => {
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

    // write the cache file
    await fs.writeFile(path, csv.join('\n'), 'utf8', function (err) {
      if (err) strapi.log.error(`Features file not saved or corrupted`);
    });
  },
};
