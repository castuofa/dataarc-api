'use strict';

var fs = require('fs');

// load a file
async function loadFile(type, name) {
  const seed_path = `${strapi.dir}/${process.env.SEED_DATA}`;
  const file = `${seed_path}/${type}/${name}.json`;
  try {
    var content = fs.readFileSync(require.resolve(file));
    strapi.log.info(`loading ${name} ${type}`);
    return JSON.parse(content);
  } catch (err) {
    strapi.log.warn(`missing ${name} ${type}`);
    return;
  }
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

  // loop through the objects permissions setting everything
  p.forEach((permission) => {
    let enable = actions.includes(permission.action);
    let p = permission;
    p.enabled = enable;
    strapi.query('permission', 'users-permissions').update({ id: p.id }, p);
  });

  strapi.log.info(`${controller} permissions set for ${role}`);

  return;
}

// create user roles
async function seed_roles() {
  let roles = await loadFile('data', 'role');

  for (let role of roles) {
    // check if it exists
    let existing = await strapi.query('role', 'users-permissions').find({
      name: role.name,
      _limit: 1,
    });
    if (existing.length === 0) {
      await strapi.query('role', 'users-permissions').create(role);
      strapi.log.info(`role created: ${role.name}`);
    } else {
      strapi.log.warn(`role exists: ${role.name}`);
    }

    // load seed permissions if they exist
    if (Array.isArray(role.permissions) && role.permissions.length) {
      for (let permission of role.permissions) {
        await set_permissions(
          role.type,
          permission.type,
          permission.controller,
          permission.actions
        );
      }
    }
  }
}

// seed users
async function seed_users() {
  let users = await loadFile('data', 'user');
  if (!users) return;

  for (let user of users) {
    // check if it exists
    let existing = await strapi.query('user', 'users-permissions').find({
      email: user.email,
      _limit: 1,
    });
    if (existing.length === 0) {
      await strapi.query('user', 'users-permissions').create(user);
      strapi.log.info(`user created: ${user.email}`);
    } else {
      strapi.log.warn(`user exists: ${user.email}`);
    }
  }
}

// seed a resource
async function seed_data(name) {
  let resources = await loadFile('data', name);
  if (!resources) return;

  let service = strapi.query(name);

  for (let resource of resources) {
    const existing = await service.find({ id: resource.id });
    if (existing.length === 0) {
      await service.create(resource);
      strapi.log.info(
        `${name} created: '${JSON.stringify(resource).substring(0, 35)}...'`
      );
    } else {
      strapi.log.warn(
        `${name} exists: '${JSON.stringify(resource).substring(0, 35)}...'`
      );
    }
  }
}

// seed resource permissions
async function seed_permissions(name) {
  let roles = await loadFile('permissions', name);
  if (!roles) return;

  for (let role of roles)
    await set_permissions(role.name, role.type, name, role.actions);
}

module.exports = async () => {
  const seed = process.env.SEED == 'true';
  const seed_resources = [
    'category',
    'combinator',
    'combinator-query',
    'concept',
    'dataset',
    'event',
    'map-layer',
    'search',
    'temporal-coverage',
    'topic-map',
    'topic',
  ];
  // only seed if true
  if (seed) {
    // create the default user roles
    await seed_roles();

    // seed the users
    await seed_users();

    // loop through the resources, add data, and set permissions
    for (let resource of seed_resources) {
      await strapi.services.helper.delete_many(resource, {});
      await seed_data(resource);
      await seed_permissions(resource);
    }
  }
};
