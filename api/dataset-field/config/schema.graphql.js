module.exports = {
  query: `
    countDatasetFields(where: JSON): Int!
    randomDatasetField(where: JSON): DatasetField
  `,
  resolver: {
    Query: {
      countDatasetFields: {
        description: 'Return the count of dataset fields',
        resolver: 'application::dataset-field.dataset-field.count',
      },
      randomDatasetField: {
        description: 'Return a random dataset field',
        resolver: 'application::dataset-field.dataset-field.random',
      },
    },
  },
};
