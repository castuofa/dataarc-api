module.exports = {
  definition: /* GraphQL */ `
    extend type Combinator {
      queries_count: Int
      concepts_count: Int
      features_count: Int
    }
  `,
  query: `
    combinatorsCount(where: JSON): Int!
  `,
  resolver: {
    Query: {
      combinatorsCount: {
        description: 'Return the count of combinators',
        resolverOf: 'application::combinator.combinator.count',
        resolver: async (obj, options, ctx) => {
          return await strapi.query('combinator').count(options.where || {});
        },
      },
      combinators: {
        resolverOf: 'application::combinator.combinator.find',
        resolver: async (obj, options, ctx) => {
          const results = await strapi
            .query('combinator')
            .find(options.where || {});
          results.map((doc) => {
            doc.queries_count = strapi
              .query('combinator-query')
              .count({ combinator: doc.id });
            doc.concepts_count = strapi
              .query('concept')
              .count({ combinators: doc.id });
            doc.features_count = strapi
              .query('feature')
              .count({ combinators: doc.id });
          });
          return results;
        },
      },
    },
  },
};
