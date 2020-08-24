module.exports = {
  query: `
    mapLayersCount(where: JSON): Int!
  `,
  resolver: {
    Query: {
      mapLayersCount: {
        description: 'Return the count of map layers',
        resolverOf: 'application::map-layer.map-layer.count',
        resolver: async (obj, options, ctx) => {
          return await strapi.query('map-layer').count(options.where || {});
        },
      },
    },
  },
};
