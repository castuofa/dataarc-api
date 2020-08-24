module.exports = {
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
    },
  },
};
