module.exports = {
  query: `
    temporalCoveragesCount(where: JSON): Int!
  `,
  resolver: {
    Query: {
      temporalCoveragesCount: {
        description: 'Return the count of temporal coverages',
        resolverOf: 'application::temporal-coverage.temporal-coverage.count',
        resolver: async (obj, options, ctx) => {
          return await strapi
            .query('temporal-coverage')
            .count(options.where || {});
        },
      },
    },
  },
};
