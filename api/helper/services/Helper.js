'use strict';

const _ = require('lodash');
const slugify = require('slugify');

module.exports = {
  get_type: (prop) => {
    return Object.prototype.toString
      .call(prop)
      .match(/\s([a-zA-Z]+)/)[1]
      .toLowerCase();
  },

  get_keyword: (value) => {
    return strapi.services.helper
      .get_name(
        value
          .replace(/https?:\/\/(www\.)?/g, '')
          .replace(
            /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
            ''
          ),
        ' '
      )
      .replace(/\d+/g, ' ')
      .replace(/\s\s+/g, ' ')
      .trim();
  },

  get_name: (
    words,
    wordSeparator = '_',
    pathSeparator = '_',
    nestedIndicator = ' --> '
  ) => {
    return words
      .split(nestedIndicator)
      .map((word) => {
        return slugify(word.replace(/[\/\\\-_*+~.()'"!:@\?\s+]/g, ' '), {
          replacement: wordSeparator,
          lower: true,
          strict: true,
          remove: /[\/\\*+~.()'"!:@\?]/g,
        });
      })
      .join(pathSeparator);
  },

  get_title: (path) => {
    return path
      .replace(/[\[\]-_.]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\w\S*/g, (s) => {
        return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase();
      });
  },

  set_state: async (params, collection, type, state, notes = '') => {
    if (!params || !collection || !type || !state) return null;
    if (strapi.services.helper.get_type(params) != 'object') {
      params = { id: params };
    }
    let data = {};
    data[type] = state;
    data[type + '_notes'] = notes;
    data[type + '_at'] = Date.now();
    return strapi.query(collection).update(params, data);
  },

  // directly access the mongoose model to perform bulk actions
  delete_many: async (collection, filter, options, callback) => {
    return strapi.query(collection).model.deleteMany(filter, options, callback);
  },

  // directly access the mongoose model to perform bulk actions
  insert_many: async (collection, docs, options, callback) => {
    return strapi.query(collection).model.insertMany(docs, options, callback);
  },
};
