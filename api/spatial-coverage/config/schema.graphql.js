module.exports = {
  query: `
    countSpatialCoverages(where: JSON): Int!
  `,
  resolver: {
    Query: {
      countSpatialCoverages: {
        description: 'Return the count of spatial coverages',
        resolver: 'application::spatial-coverage.spatial-coverage.count',
      },
    },
  },
};
