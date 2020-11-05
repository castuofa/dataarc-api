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
  `,
  resolver: {
    Query: {
      countDatasets: {
        description: 'Return the count of datasets',
        resolver: 'application::dataset.dataset.count',
      },
      datasets: {
        resolverOf: 'application::dataset.dataset.find',
        resolver: async (obj, options, ctx) => {
          const params = await strapi.services['helper'].getParams(options);
          const results = await strapi.query('dataset').find(params);
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
