module.exports = {
  query: `
    countSearches(where: JSON): Int!
  `,
  resolver: {
    Query: {
      countSearches: {
        description: 'Return the count of searches',
        resolver: 'application::search.search.count',
      },
    },
  },
};
