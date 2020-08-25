module.exports = {
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
    },
  },
};
