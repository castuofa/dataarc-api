'use strict';

const _ = require('lodash');
const slugify = require('slugify');

module.exports = {
  // get the type of the property
  get_type: (prop) => {
    return Object.prototype.toString
      .call(prop)
      .match(/\s([a-zA-Z]+)/)[1]
      .toLowerCase();
  },

  // get an seo friendly keyword
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

  // get an seo friendly name
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

  // get a clean title
  get_title: (path) => {
    return path
      .replace(/[\[\]-_.]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\w\S*/g, (s) => {
        return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase();
      });
  },

  // set the state for a collection based on params
  set_state: async (params, collection, state, msg = '') => {
    if (!params || !collection || !state) return null;
    if (strapi.services.helper.get_type(params) != 'object') {
      params = { id: params };
    }
    return strapi
      .query(collection)
      .update(params, {
        state: state,
        state_msg: msg,
        state_at: Date.now(),
      })
      .catch(function (err) {
        switch (err.status) {
          case 404:
            strapi.log.warn(
              `${collection} state not updated, no matching results`
            );
            break;
          default:
            strapi.log.warn(
              `${collection} state not updated, error ${err.status}`
            );
            break;
        }
      });
  },

  // log an event
  log_event: async (
    action,
    item,
    name,
    user,
    payload = null,
    details = null
  ) => {
    // let { result, params, data }
    strapi.services.event
      .create({
        action,
        item,
        name,
        details,
        payload,
        user,
      })
      .catch(function (err) {
        strapi.log.warn(`${err.status}: event log error for ${item}:${action}`);
      });
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
