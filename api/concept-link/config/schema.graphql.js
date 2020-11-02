module.exports = {
  query: `
    countConceptLinks(where: JSON): Int!
  `,
  resolver: {
    Query: {
      countConceptLinks: {
        description: 'Return the count of concept links',
        resolver: 'application::concept-link.concept-link.count',
      },
    },
  },
};
