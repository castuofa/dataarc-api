module.exports = {
  query: `
    datasetsCount(where: JSON): Int!
  `,
  resolver: {
    Query: {
      datasetsCount: {
        description: 'Return the count of datasets',
        resolverOf: 'application::dataset.dataset.count',
        resolver: async (obj, options, ctx) => {
          return await strapi.query('dataset').count(options.where || {});
        },
      },
    },
  },
};
