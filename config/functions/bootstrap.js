'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 *
 * See more details here: https://strapi.io/documentation/v3.x/concepts/configurations.html#bootstrap
 */

// Create the primary admin account
async function bootstrap_admin() {
  strapi.log.info(`(Bootstrap) Bootstrapping admin user`);

  const admin = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@data-arc.org',
    blocked: false,
  };

  const admin_orm = strapi.query('administrator', 'admin');
  const admins = await admin_orm.find({ username: admin.username });

  if (admins.length === 0) {
    admin.password = await strapi.admin.services.auth.hashPassword(
      admin.password
    );

    try {
      await admin_orm.create(admin);

      strapi.log.warn(`(Bootstrap) Primary admin account created`);
    } catch (error) {
      console.error(error);
    }
  } else {
    strapi.log.warn(`(Bootstrap) Primary admin account already exists`);
  }
}

// Create the administrator role for users
async function bootstrap_adminrole() {
  strapi.log.info(`(Bootstrap) Bootstrapping user administrator role`);

  const roles = await strapi
    .query('role', 'users-permissions')
    .find({ type: 'administrator', _limit: 1 });

  if (roles.length === 0) {
    try {
      const plugins = await strapi.plugins[
        'users-permissions'
      ].services.userspermissions.getPlugins('en');

      const permissions = await strapi.plugins[
        'users-permissions'
      ].services.userspermissions.getActions(plugins);

      const admin_role = {
        name: 'Administrator',
        description: 'DataARC Administration Role',
        permissions,
        users: [],
      };

      await strapi.plugins[
        'users-permissions'
      ].services.userspermissions.createRole(admin_role);

      strapi.log.warn(`(Bootstrap) Administrator role created`);
    } catch (error) {
      console.error(error);
    }
  } else {
    strapi.log.warn(`(Bootstrap) Administrator role already exists`);
  }
}

module.exports = async () => {
  await bootstrap_admin();
  await bootstrap_adminrole();

  // TODO: Add data
};
