module.exports = {
  query: `
    categoriesCount(where: JSON): Int!
  `,
  resolver: {
    Query: {
      categoriesCount: {
        description: 'Return the count of categories',
        resolverOf: 'application::category.category.count',
        resolver: async (obj, options, ctx) => {
          return await strapi.query('category').count(options.where || {});
        },
      },
    },
  },
};
