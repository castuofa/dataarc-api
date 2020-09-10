module.exports = {
  query: `
    countMapLayers(where: JSON): Int!
  `,
  resolver: {
    Query: {
      countMapLayers: {
        description: 'Return the count of map layers',
        resolver: 'application::map-layer.map-layer.count',
      },
    },
  },
};
