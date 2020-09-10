module.exports = {
  definition: /* GraphQL */ `
    extend type Category {
      datasets_count: Int
    }
  `,
  query: `
    countCategories(where: JSON): Int!
  `,
  resolver: {
    Query: {
      countCategories: {
        description: 'Return the count of categories',
        resolver: 'application::category.category.count',
      },
      categories: {
        resolverOf: 'application::category.category.find',
        resolver: async (obj, options, ctx) => {
          const results = await strapi
            .query('category')
            .find(options.where || {});
          results.map((doc) => {
            doc.datasets_count = strapi
              .query('dataset')
              .count({ category: doc.id });
          });
          return results;
        },
      },
    },
  },
};
