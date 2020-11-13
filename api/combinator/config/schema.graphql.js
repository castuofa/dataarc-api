module.exports = {
  definition: /* GraphQL */ `
    extend type Combinator {
      queries_count: Int
      concepts_count: Int
      features_count: Int
    }
    type CombinatorResults {
      combinator: Combinator
      features: [Feature]
      matched_count: Int
      total_count: Int
    }
  `,
  query: `
    countCombinators(where: JSON): Int!
    combinatorResults(id: ID): CombinatorResults
  `,
  resolver: {
    Query: {
      countCombinators: {
        description: 'Return the count of combinators',
        resolver: 'application::combinator.combinator.count',
      },
      combinatorResults: {
        description: 'Execute and return the results of the combinator',
        resolver: 'application::combinator.combinator.results',
      },
      combinators: {
        resolverOf: 'application::combinator.combinator.find',
        resolver: async (obj, options, ctx) => {
          const params = await strapi.services['helper'].getParams(options);
          const results = await strapi.query('combinator').find(params);
          results.map((doc) => {
            doc.concepts_count = doc.concepts ? doc.concepts.length : 0;
            doc.queries_count = doc.queries ? doc.queries.length : 0;
            doc.features_count = doc.features ? doc.features.length : 0;
          });
          return results;
        },
      },
    },
  },
};
