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
          const results = await strapi
            .query('feature')
            .find(options.where || {});
          results.map((doc) => {
            doc.combinators_count = strapi
              .query('combinator')
              .count({ features: doc.id });
            doc.concepts_count = strapi
              .query('concept')
              .count({ features: doc.id });
          });
          return results;
        },
      },
    },
  },
};
