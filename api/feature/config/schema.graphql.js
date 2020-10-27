module.exports = {
  definition: /* GraphQL */ `
    extend type Feature {
      combinators_count: Int
      concepts_count: Int
    }
  `,
  query: `
    countFeatures(where: JSON): Int!
    randomFeature(where: JSON): Feature
  `,
  resolver: {
    Query: {
      countFeatures: {
        description: 'Return the count of features',
        resolver: 'application::feature.feature.count',
      },
      randomFeature: {
        description: 'Return a random feature',
        resolver: 'application::feature.feature.random',
      },
      features: {
        resolverOf: 'application::feature.feature.find',
        resolver: async (obj, options, ctx) => {
          const params = await strapi.services['helper'].prefix_graphql_params(
            options
          );
          const results = await strapi.query('feature').find(params);
          results.map((doc) => {
            doc.combinators_count = doc.combinators
              ? doc.combinators.length
              : 0;
            doc.concepts_count = doc.concepts ? doc.concepts.length : 0;
          });
          return results;
        },
      },
    },
  },
};
