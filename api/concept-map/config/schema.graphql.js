module.exports = {
  query: `
    conceptMapsCount(where: JSON): Int!
  `,
  resolver: {
    Query: {
      conceptMapsCount: {
        description: 'Return the count of concept maps',
        resolver: 'application::concept-map.concept-map.count',
      },
    },
  },
};
