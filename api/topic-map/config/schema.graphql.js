module.exports = {
  query: `
    topicMapsCount(where: JSON): Int!
  `,
  resolver: {
    Query: {
      topicMapsCount: {
        description: 'Return the count of topic maps',
        resolverOf: 'application::topic-map.topic-map.count',
        resolver: async (obj, options, ctx) => {
          return await strapi.query('topic-map').count(options.where || {});
        },
      },
    },
  },
};
