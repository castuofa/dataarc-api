module.exports = {
  definition: /* GraphQL */ `
    extend type Combinator {
      queries_count: Int
      concepts_count: Int
      features_count: Int
    }
  `,
  query: `
    countCombinators(where: JSON): Int!
    randomCombinator(where: JSON): Combinator
  `,
  resolver: {
    Query: {
      countCombinators: {
        description: 'Return the count of combinators',
        resolver: 'application::combinator.combinator.count',
      },
      randomCombinator: {
        description: 'Return a random combinator',
        resolver: 'application::combinator.combinator.random',
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
