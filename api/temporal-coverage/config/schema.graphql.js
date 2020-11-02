module.exports = {
  query: `
    countTemporalCoverages(where: JSON): Int!
  `,
  resolver: {
    Query: {
      countTemporalCoverages: {
        description: 'Return the count of temporal coverages',
        resolver: 'application::temporal-coverage.temporal-coverage.count',
      },
    },
  },
};
