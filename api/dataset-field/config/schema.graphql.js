module.exports = {
  query: `
    datasetFieldsCount(where: JSON): Int!
  `,
  resolver: {
    Query: {
      datasetFieldsCount: {
        description: 'Return the count of dataset fields',
        resolverOf: 'application::dataset-field.dataset-field.count',
        resolver: async (obj, options, ctx) => {
          return await strapi.query('dataset-field').count(options.where || {});
        },
      },
    },
  },
};
