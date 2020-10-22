module.exports = {
  query: `
    countDatasetFields(where: JSON): Int!
  `,
  resolver: {
    Query: {
      countDatasetFields: {
        description: 'Return the count of dataset fields',
        resolver: 'application::dataset-field.dataset-field.count',
      },
    },
  },
};
