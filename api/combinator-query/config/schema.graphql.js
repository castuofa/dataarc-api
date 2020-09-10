module.exports = {
  query: `
    countCombinatorQueries(where: JSON): Int!
    randomCombinatorQuery(where: JSON): CombinatorQuery
  `,
  resolver: {
    Query: {
      countCombinatorQueries: {
        description: 'Return the count of combinator queries',
        resolver: 'application::combinator-query.combinator-query.count',
      },
      randomCombinatorQuery: {
        description: 'Return a random combinator query',
        resolver: 'application::combinator-query.combinator-query.random',
      },
    },
  },
};
