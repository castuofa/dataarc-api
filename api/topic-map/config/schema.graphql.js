module.exports = {
  definition: /* GraphQL */ `
    extend type TopicMap {
      topics_count: Int
    }
  `,
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
      topicMaps: {
        resolverOf: 'application::topic-map.topic-map.find',
        resolver: async (obj, options, ctx) => {
          const results = await strapi
            .query('topic-map')
            .find(options.where || {});
          results.map((doc) => {
            doc.topics_count = strapi
              .query('topics')
              .count({ topic_map: doc.id });
          });
          return results;
        },
      },
    },
  },
};
