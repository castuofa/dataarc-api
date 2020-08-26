module.exports = {
  definition: /* GraphQL */ `
    extend type Feature {
      combinators_count: Int
      concepts_count: Int
    }
  `,
  query: `
    featuresCount(where: JSON): Int!
  `,
  resolver: {
    Query: {
      featuresCount: {
        description: 'Return the count of features',
        resolverOf: 'application::feature.feature.count',
        resolver: async (obj, options, ctx) => {
          return await strapi.query('feature').count(options.where || {});
        },
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
