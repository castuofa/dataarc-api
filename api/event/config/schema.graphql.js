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
          const params = await strapi.services.helper.prefix_graphql_params(
            options
          );
          return await strapi.query('event').count(params);
        },
      },
    },
  },
};
