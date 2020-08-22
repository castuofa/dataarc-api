'use strict';

const slugify = require('slugify');
const options = {
  lower: true,
  strict: true,
  remove: /[*+~.()'"!:@]/g,
};

module.exports = {
  lifecycles: {
    beforeCreate: async (data) => {
      if (data.title) {
        data.name = slugify(data.title, options);
      }
    },
    beforeUpdate: async (params, data) => {
      if (data.title) {
        data.name = slugify(data.title, options);
      }
    },
  },
};
