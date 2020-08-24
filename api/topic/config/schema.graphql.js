module.exports = {
  query: `
    topicsCount(where: JSON): Int!
  `,
  resolver: {
    Query: {
      topicsCount: {
        description: 'Return the count of topics',
        resolverOf: 'application::topic.topic.count',
        resolver: async (obj, options, ctx) => {
          return await strapi.query('topic').count(options.where || {});
        },
      },
    },
  },
};
