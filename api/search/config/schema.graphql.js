module.exports = {
  query: `
    searchesCount(where: JSON): Int!
  `,
  resolver: {
    Query: {
      searchesCount: {
        description: 'Return the count of searches',
        resolverOf: 'application::search.search.count',
        resolver: async (obj, options, ctx) => {
          return await strapi.query('search').count(options.where || {});
        },
      },
    },
  },
};
