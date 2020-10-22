module.exports = {
  definition: /* GraphQL */ `
    extend type Concept {
      related_count: Int
      contextual_count: Int
    }
  `,
  query: `
    countConcepts(where: JSON): Int!
  `,
  resolver: {
    Query: {
      countConcepts: {
        description: 'Return the count of concepts',
        resolver: 'application::concept.concept.count',
      },
      concepts: {
        resolverOf: 'application::concept.concept.find',
        resolver: async (obj, options, ctx) => {
          const params = await strapi.services.helper.prefix_graphql_params(
            options
          );
          const results = await strapi.query('concept').find(params);
          console.log(`${JSON.stringify(results, null, 2)}`);
          results.map((doc) => {
            doc.combinators_count = results.related.length;
            doc.combinators_count = results.contextual.length;
          });
          return results;
        },
      },
    },
  },
};
