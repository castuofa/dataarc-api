module.exports = {
  query: `
    countTopics(where: JSON): Int!
  `,
  resolver: {
    Query: {
      countTopics: {
        description: 'Return the count of topics',
        resolver: 'application::topic.topic.count',
      },
    },
  },
};
