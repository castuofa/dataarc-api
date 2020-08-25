module.exports = {
  query: `
    eventsCount(where: JSON): Int!
  `,
  resolver: {
    Query: {
      eventsCount: {
        description: 'Return the count of events',
        resolverOf: 'application::event.event.count',
        resolver: async (obj, options, ctx) => {
          return await strapi.query('event').count(options.where || {});
        },
      },
    },
  },
};
