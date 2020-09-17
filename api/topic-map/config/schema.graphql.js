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
          const params = await strapi.services.helper.prefix_graphql_params(
            options
          );
          return await strapi.query('topic-map').count(params);
        },
      },
      topicMaps: {
        resolverOf: 'application::topic-map.topic-map.find',
        resolver: async (obj, options, ctx) => {
          const params = await strapi.services.helper.prefix_graphql_params(
            options
          );
          const results = await strapi.query('topic-map').find(params);
          results.map((doc) => {
            doc.topics_count = strapi
              .query('topic')
              .count({ topic_map: doc.id });
          });
          return results;
        },
      },
    },
  },
};
