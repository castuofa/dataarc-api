module.exports = {
  definition: /* GraphQL */ `
    extend type Category {
      datasets_count: Int
    }
  `,
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
