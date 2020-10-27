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
          const params = await strapi.services['helper'].prefix_graphql_params(
            options
          );
          const results = await strapi.query('category').find(params);
          results.map((doc) => {
            doc.datasets_count = doc.datasets ? doc.datasets.length : 0;
          });
          return results;
        },
      },
    },
  },
};
