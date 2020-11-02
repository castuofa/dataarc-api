module.exports = {
  query: `
    countConceptTopics(where: JSON): Int!
  `,
  resolver: {
    Query: {
      countConceptTopics: {
        description: 'Return the count of concept topics',
        resolver: 'application::concept-topic.concept-topic.count',
      },
    },
  },
};
