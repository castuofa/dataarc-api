module.exports = {
  query: `
    countEvents(where: JSON): Int!
  `,
  resolver: {
    Query: {
      countEvents: {
        description: 'Return the count of events',
        resolver: 'application::event.event.count',
      },
    },
  },
};
