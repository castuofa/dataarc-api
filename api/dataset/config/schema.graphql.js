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
            doc.fields_count = doc.fields ? doc.fields.length : 0;
            doc.features_count = doc.features ? doc.features.length : 0;
            doc.combinators_count = doc.combinators
              ? doc.combinators.length
              : 0;
          });
          return results;
        },
      },
    },
  },
};
