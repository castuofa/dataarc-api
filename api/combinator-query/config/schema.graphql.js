module.exports = {
  query: `
    combinatorQueriesCount(where: JSON): Int!
  `,
  resolver: {
    Query: {
      combinatorQueriesCount: {
        description: 'Return the count of combinator queries',
        resolverOf: 'application::combinator-query.combinator-query.count',
        resolver: async (obj, options, ctx) => {
          return await strapi
            .query('combinator-query')
            .count(options.where || {});
        },
      },
    },
  },
};
