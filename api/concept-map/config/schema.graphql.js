module.exports = {
  definition: /* GraphQL */ `
    extend type ConceptMap {
      topics_count: Int
    }
  `,
  query: `
    countConceptMaps(where: JSON): Int!
  `,
  resolver: {
    Query: {
      countConceptMaps: {
        description: 'Return the count of concept maps',
        resolver: 'application::concept-map.concept-map.count',
      },
      conceptMaps: {
        resolverOf: 'application::concept-map.concept-map.find',
        resolver: async (obj, options, ctx) => {
          const params = await strapi.services.helper.prefix_graphql_params(
            options
          );
          const results = await strapi.query('concept-map').find(params);
          results.map((doc) => {
            doc.topics_count = doc.topics.length ? doc.topics.length : 0;
          });
          return results;
        },
      },
    },
  },
};
