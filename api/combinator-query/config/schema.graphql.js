module.exports = {
  query: `
    countCombinatorQueries(where: JSON): Int!
  `,
  resolver: {
    Query: {
      countCombinatorQueries: {
        description: 'Return the count of combinator queries',
        resolver: 'application::combinator-query.combinator-query.count',
      },
    },
  },
};
