'use strict';

var fs = require('fs');

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 *
 * See more details here: https://strapi.io/documentation/v3.x/concepts/configurations.html#bootstrap
 */

// load a file
async function loadFile(name) {
  const path = `../../${process.env.SEED_DATA}/${name}.json`;
  try {
    strapi.log.info(`Loading '${name}'`);
    var content = fs.readFileSync(require.resolve(path));
    return JSON.parse(content);
  } catch (err) {
    strapi.log.warn(`Missing '${name}'`);
    return;
  }
}

// Create the primary admin account
async function create_admin(admin) {
  const admin_orm = strapi.query('administrator', 'admin');
  const admins = await admin_orm.find({ username: admin.username });

  if (admins.length === 0) {
    admin.password = await strapi.admin.services.auth.hashPassword(
      admin.password
    );

    try {
      await admin_orm.create(admin);

      strapi.log.info(`Primary admin account created`);
    } catch (err) {
      strapi.log.error(`${err}`);
    }
  } else {
    strapi.log.warn(`Primary admin account already exists`);
  }
}

// create user roles
async function create_roles(name) {
  let roles = await loadFile(`data/${name}`);

  for (let role of roles) {
    // check if it exists
    let existing = await strapi.query('role', 'users-permissions').find({
      name: role.name,
      _limit: 1,
    });
    if (existing.length === 0) {
      let result = await strapi.query('role', 'users-permissions').create(role);
      strapi.log.info(`Role '${role.name}' created ${JSON.stringify(result)}`);
    } else {
      strapi.log.warn(`Role '${role.name}' already exists`);
    }
  }
}

// seed a resource
async function seed_data(name) {
  let resources = await loadFile(`data/${name}`);
  if (!resources) return;

  let service = strapi.services[name];

  for (let resource of resources) {
    if ((await service.count(resource)) === 0) {
      await service.create(resource);
      strapi.log.info(`${name} created: ${JSON.stringify(resource)}`);
    }
  }
}

// load seed permissions from file
async function seed_permissions(name) {
  let roles = await loadFile(`permissions/${name}`);
  if (!roles) return;

  for (let role of roles)
    await set_permissions(role.name, role.type, name, role.actions);
}

// set user permissions for a controller
async function set_permissions(role, type, controller, actions) {
  // query for the role
  const r = await strapi
    .query('role', 'users-permissions')
    .findOne({ type: role });

  // make sure we found the role
  if (!r) return;

  // get target permissions for object
  let p = await strapi.query('permission', 'users-permissions').find({
    role: r.id,
    type: type,
    controller: controller,
  });

  // make sure we have permissions
  if (p.length == 0) return;

  strapi.log.info(`Setting '${role}' permissions for '${controller}'`);

  // loop through the objects permissions setting everything
  p.forEach((permission) => {
    let enable = actions.includes(permission.action);
    let p = permission;
    p.enabled = enable;
    strapi.query('permission', 'users-permissions').update({ id: p.id }, p);
  });

  return;
}

module.exports = async () => {
  const seed = process.env.SEED || false;
  const admin = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@data-arc.org',
    blocked: false,
  };

  if (seed) {
    // create the admin account
    await create_admin(admin);

    // create the default user roles
    await create_roles('role');

    // seed the users
    // await seed_data('user');

    // seed the default data from the seed directory
    // file names match controller names
    await seed_data('category');
    await seed_data('combinator');
    await seed_data('combinator-query');
    await seed_data('concept');
    await seed_data('dataset');
    await seed_data('dataset-feature');
    await seed_data('dataset-field');
    await seed_data('dataset-template');
    await seed_data('event');
    await seed_data('map-layer');
    await seed_data('search');
    await seed_data('temporal-coverage');
    await seed_data('topic-map');

    // now set the permissions
    await seed_permissions('category');
    await seed_permissions('combinator');
    await seed_permissions('combinator-query');
    await seed_permissions('concept');
    await seed_permissions('dataset');
    await seed_permissions('dataset-feature');
    await seed_permissions('dataset-field');
    await seed_permissions('dataset-template');
    await seed_permissions('event');
    await seed_permissions('map-layer');
    await seed_permissions('search');
    await seed_permissions('temporal-coverage');
    await seed_permissions('topic-map');
  }
};
