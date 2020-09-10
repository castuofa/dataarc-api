module.exports = {
  query: `
    countSearches(where: JSON): Int!
    randomSearch(where: JSON): Search
  `,
  resolver: {
    Query: {
      countSearches: {
        description: 'Return the count of searches',
        resolver: 'application::search.search.count',
      },
      randomSearch: {
        description: 'Return a random search',
        resolver: 'application::search.search.random',
      },
    },
  },
};
