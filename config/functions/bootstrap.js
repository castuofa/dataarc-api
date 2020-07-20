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

module.exports = async () => {
  const lang = 'en';

  // Auto create the primary admin account
  const admin = {
    username: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASS || 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@data-arc.org',
    blocked: false,
  };
  const admins = await strapi
    .query('administrator', 'admin')
    .find({ _limit: 1 });
  if (admins.length) {
    console.error('(Admin) A primary admin account already exists');
  } else {
    admin.password = await strapi.admin.services.auth.hashPassword(
      admin.password
    );
    try {
      const admin = await strapi.query('administrator', 'admin').create({
        ...admin,
      });
      console.info('(Admin) Primary admin account created');
    } catch (error) {
      console.error(error);
    }
  }

  // Create the administrator role for users
  const roles = await strapi
    .query('role', 'users-permissions')
    .find({ type: 'administrator', _limit: 1 });
  if (roles.length) {
    console.error('(Role) Administrator user role already exists');
  } else {
    try {
      const plugins = await strapi.plugins[
        'users-permissions'
      ].services.userspermissions.getPlugins(lang);
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
      console.info('(Role) Administrator user role created');
    } catch (error) {
      console.error(error);
    }
  }

  // TODO: Add data, clean up
};
