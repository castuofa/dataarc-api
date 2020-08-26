'use strict';

const _ = require('lodash');
const fs = require('fs');
const zlib = require('zlib');
const { chain } = require('stream-chain');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');
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

  // load json from a file
  load_json: (type, collection) => {
    const seed_path = `${strapi.dir}/${process.env.SEED_PATH}`;
    const file = `${seed_path}/${type}/${collection}.json`;
    if (!fs.existsSync(file)) {
      strapi.log.warn(`missing ${file}`);
      return;
    }
    try {
      var content = fs.readFileSync(require.resolve(file));
      return JSON.parse(content);
    } catch (err) {
      strapi.log.warn(`invalid ${collection} ${type}`);
      return;
    }
  },

  // set user permissions for a controller
  set_permissions: async (role_name, type, controller, actions) => {
    // query for the role
    let role = await strapi
      .query('role', 'users-permissions')
      .findOne({ type: role_name });

    // make sure we found the role
    if (!role) return;

    // get target permissions for object
    let permissions = await strapi
      .query('permission', 'users-permissions')
      .find({
        role: role.id,
        type: type,
        controller: controller,
      });

    // make sure we have permissions
    if (permissions.length == 0) return;

    // loop through the objects permissions setting everything
    _.each(permissions, async (permission) => {
      let enable = actions.includes(permission.action);
      permission.enabled = enable;
      await strapi
        .query('permission', 'users-permissions')
        .update({ id: permission.id }, permission);
    });
  },

  // create user roles
  seed_roles: async () => {
    let roles = strapi.services.helper.load_json('data', 'role');
    _.each(roles, async (role) => {
      let exists = await strapi.query('role', 'users-permissions').count({
        type: role.type,
      });
      if (!exists) {
        strapi.query('role', 'users-permissions').create(role);
        strapi.log.info(`role created: ${role.name}`);
      }

      // set permissions
      _.each(role.permissions, async (permission) =>
        strapi.services.helper.set_permissions(
          role.type,
          permission.type,
          permission.controller,
          permission.actions
        )
      );
    });
  },

  // seed users
  seed_users: async () => {
    let users = strapi.services.helper.load_json('data', 'user');
    if (!users) return;

    _.each(users, async (user) => {
      let exists = await strapi.query('user', 'users-permissions').count({
        email: user.email,
      });
      if (!exists) {
        await strapi.query('user', 'users-permissions').create(user);
        strapi.log.info(`user created \t[${user.email}]`);
      }
    });
  },

  // seed collection permissions
  seed_permissions: async (collection) => {
    let roles = await strapi.services.helper.load_json(
      'permissions',
      collection
    );
    if (!roles) return;

    roles.map((role) => {
      strapi.services.helper.set_permissions(
        role.name,
        role.type,
        collection,
        role.actions
      );
    });
  },

  // seed a collection
  seed_collection: async (collection) => {
    // set permissions
    // strapi.services.helper.seed_permissions(collection);

    // clear docs
    // await strapi
    //   .query(collection)
    //   .model.deleteMany({})
    //   .then((result) => {
    //     strapi.log.info(
    //       `${result.deletedCount} items(s) removed \t[${collection}]`
    //     );
    //   })
    //   .catch((err) => {
    //     strapi.log.error(`${collection} delete failed: ${err}`);
    //   });

    // create relationships
    const pipeline = chain([
      await strapi.services.helper.seed_permissions(collection),
      await strapi
        .query(collection)
        .model.deleteMany({})
        .then((result) => {
          strapi.log.debug(
            `${result.deletedCount} items(s) removed \t[${collection}]`
          );
        })
        .catch((err) => {
          strapi.log.error(`${collection} delete failed: ${err}`);
        }),
      fs
        .createReadStream(
          `${strapi.dir}/${process.env.SEED_PATH}/data/${collection}.json.gz`
        )
        .on('error', (err) => {
          strapi.log.error(`${collection} unable to load data file`);
        }),
      zlib.createGunzip(),
      parser(),
      streamArray(),
      (data) => {
        strapi.query(collection).create(data.value);
        return data;
      },
    ]);

    let createdCount = 0;
    pipeline.on('data', () => ++createdCount);
    pipeline.on('end', () =>
      strapi.log.debug(`${createdCount} item(s) created \t[${collection}]`)
    );
    pipeline.on('error', (error) =>
      strapi.log.error(`${collection} create failed: ${error}`)
    );

    // strapi.query(collection).create(docs);

    // create and reconnect relationships
    // _.each(docs, async (doc) => {
    //   await strapi
    //     .query(collection)
    //     .create(doc)
    //     .then((result) => {
    //       strapi.log.info(`${doc.id} record created \t[${collection}]`);
    //     });
    // });
  },

  // seed collection array
  seed_collections: async (collections) => {
    _.each(collections, (collection) => {
      strapi.services.helper.seed_collection(collection);
    });
  },

  // seed data
  seed: async () => {
    await strapi.services.helper.seed_roles();
    await strapi.services.helper.seed_users();

    let first = [
      'category',
      'concept',
      'event',
      'map-layer',
      'search',
      'temporal-coverage',
      'topic-map',
    ];
    await strapi.services.helper.seed_collections(first);

    let second = [
      'dataset', // after category
      'topic', // after topic-map & concept
    ];
    await strapi.services.helper.seed_collections(second);

    let third = [
      'dataset-field', // after dataset
      'combinator', // after dataset & concept
    ];
    await strapi.services.helper.seed_collections(third);

    let fourth = [
      'combinator-query', // after combinator
      'feature', // after concept, dataset, combinator
    ];
    // await strapi.services.helper.seed_collections(fourth);
  },
};
