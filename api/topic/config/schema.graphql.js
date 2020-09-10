module.exports = {
  query: `
    countTopics(where: JSON): Int!
    randomTopic(where: JSON): Topic
  `,
  resolver: {
    Query: {
      countTopics: {
        description: 'Return the count of topics',
        resolver: 'application::topic.topic.count',
      },
      randomTopic: {
        description: 'Return a random topic',
        resolver: 'application::topic.topic.random',
      },
    },
  },
};
