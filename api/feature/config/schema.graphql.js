module.exports = {
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
    },
  },
};
