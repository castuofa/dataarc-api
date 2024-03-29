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
          const params = await strapi.services['helper'].getParams(options);
          const results = await strapi.query('concept-map').find(params);
          results.map((doc) => {
            doc.topics_count = strapi
              .query('concept-topic')
              .count({ map: doc.id });
          });
          return results;
        },
      },
    },
  },
};
