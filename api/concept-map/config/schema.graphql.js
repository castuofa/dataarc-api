module.exports = {
  definition: /* GraphQL */ `
    extend type ConceptMap {
      topics_count: Int
      concepts_count: Int
    }
  `,
  query: `
    conceptMapsCount(where: JSON): Int!
  `,
  resolver: {
    Query: {
      conceptMapsCount: {
        description: 'Return the count of concept maps',
        resolverOf: 'application::concept-map.concept-map.count',
        resolver: async (obj, options, ctx) => {
          const params = await strapi.services.helper.prefix_graphql_params(
            options
          );
          return await strapi.query('concept-map').count(params);
        },
      },
      conceptMaps: {
        resolverOf: 'application::concept-map.concept-map.find',
        resolver: async (obj, options, ctx) => {
          const params = await strapi.services.helper.prefix_graphql_params(
            options
          );
          const results = await strapi.query('concept-map').find(params);
          results.map((doc) => {
            doc.topics_count = strapi
              .query('topic')
              .count({ topic_map: doc.id });
          });
          results.map((doc) => {
            doc.concepts_count = strapi
              .query('concept')
              .count({ concept_map: doc.id });
          });
          return results;
        },
      },
    },
  },
};
