module.exports = {
  definition: /* GraphQL */ `
    extend type Concept {
      combinators_count: Int
      topics_count: Int
    }
  `,
  query: `
    conceptsCount(where: JSON): Int!
  `,
  resolver: {
    Query: {
      conceptsCount: {
        description: 'Return the count of concepts',
        resolverOf: 'application::concept.concept.count',
        resolver: async (obj, options, ctx) => {
          return await strapi.query('concept').count(options.where || {});
        },
      },
      concepts: {
        resolverOf: 'application::concept.concept.find',
        resolver: async (obj, options, ctx) => {
          const results = await strapi
            .query('concept')
            .find(options.where || {});
          results.map((doc) => {
            doc.combinators_count = strapi
              .query('combinator')
              .count({ concepts: doc.id });
            doc.combinators_count = strapi
              .query('topic')
              .count({ concept: doc.id });
          });
          return results;
        },
      },
    },
  },
};
