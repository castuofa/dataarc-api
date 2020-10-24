'use strict';

/**
 * `seeder` service.
 */

const _ = require('lodash');
const fs = require('fs');

module.exports = {
  // load json from a file
  load: (type, collection) => {
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

  // seed user roles
  seed_roles: async () => {
    let roles = strapi.services.seeder.load('data', 'role');

    // loop through our roles making sure they exist
    _.each(roles, async (r) => {
      let role = await strapi.services.helper.get_or_create_role({
        name: r.name,
        type: r.type,
        description: r.description,
      });
      if (!role) return;

      // loop through and enable permissions for this role
      _.each(r.permissions, (permission) =>
        strapi.services.helper.enable_permissions(
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
    let users = strapi.services.seeder.load('data', 'user');
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
    let roles = await strapi.services.seeder.load('permissions', collection);
    if (!roles) return;

    roles.map((role) => {
      strapi.services.helper.enable_permissions(
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
    // strapi.services.seeder.seed_permissions(collection);

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
      await strapi.services.seeder.seed_permissions(collection),
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
          `${strapi.dir}/${process.env.SEED_PATH}/data/${collection}.json`
        )
        .on('error', (err) => {
          strapi.log.error(`${collection} unable to load data file`);
        }),
      // zlib.createGunzip(),
      parser(),
      streamArray(),
      (data) => {
        try {
          strapi.query(collection).create(data.value);
        } catch (err) {
          strapi.log.error(`[${collection}] Error creating entry`);
        }
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
  },

  // seed collection array
  seed_collections: async (collections) => {
    _.each(collections, (collection) => {
      strapi.services.seeder.seed_collection(collection);
    });
  },

  // seed data
  seed: async () => {
    strapi.log.info(`Seeding data`);
    await strapi.services.seeder.seed_roles();
    // await strapi.services.seeder.seed_users();

    let first = [
      'category',
      'concept',
      'event',
      'map-layer',
      'search',
      'temporal-coverage',
      'topic-map',
    ];
    await strapi.services.seeder.seed_collections(first);

    let second = [
      'dataset', // after category
      'topic', // after topic-map & concept
    ];
    await strapi.services.seeder.seed_collections(second);

    let third = [
      'dataset-field', // after dataset
      'combinator', // after dataset & concept
    ];
    await strapi.services.seeder.seed_collections(third);

    let fourth = [
      'combinator-query', // after combinator
      'feature', // after concept, dataset, combinator
    ];
    await strapi.services.seeder.seed_collections(fourth);
  },
};
