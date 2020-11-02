module.exports = {
  query: `
    countConcepts(where: JSON): Int!
  `,
  resolver: {
    Query: {
      countConcepts: {
        description: 'Return the count of concepts',
        resolver: 'application::concept.concept.count',
      },
    },
  },
};
