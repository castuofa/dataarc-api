module.exports = {
  definition: /* GraphQL */ `
    extend type Concept {
      combinators_count: Int
      topics_count: Int
    }
  `,
  query: `
    countConcepts(where: JSON): Int!
    randomConcept(where: JSON): Concept
  `,
  resolver: {
    Query: {
      countConcepts: {
        description: 'Return the count of concepts',
        resolver: 'application::concept.concept.count',
      },
      randomConcept: {
        description: 'Return a random concept',
        resolver: 'application::concept.concept.random',
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
