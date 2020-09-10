module.exports = {
  definition: /* GraphQL */ `
    extend type Dataset {
      fields_count: Int
      features_count: Int
      combinators_count: Int
    }
  `,
  query: `
    countDatasets(where: JSON): Int!
    randomDataset(where: JSON): Dataset
  `,
  resolver: {
    Query: {
      countDatasets: {
        description: 'Return the count of datasets',
        resolver: 'application::dataset.dataset.count',
      },
      randomDataset: {
        description: 'Return a random dataset',
        resolver: 'application::dataset.dataset.random',
      },
      datasets: {
        resolverOf: 'application::dataset.dataset.find',
        resolver: async (obj, options, ctx) => {
          const results = await strapi
            .query('dataset')
            .find(options.where || {});
          results.map((doc) => {
            doc.fields_count = strapi
              .query('dataset-field')
              .count({ dataset: doc.id });
            doc.features_count = strapi
              .query('feature')
              .count({ dataset: doc.id });
            doc.combinators_count = strapi
              .query('combinator')
              .count({ dataset: doc.id });
          });
          return results;
        },
      },
    },
  },
};
