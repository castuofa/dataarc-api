'use strict';

const { sanitizeEntity } = require('strapi-utils');
const { validateProfileUpdateInput } = require('./validation/authenticated-user');

const sanitizeUser = user =>
  sanitizeEntity(user, {
    model: strapi.query('user', 'users-permissions').model,
  });

module.exports = {
 /**
   * Update authenticated user.
   * @return {Object|Array}
   */
  async updateMe(ctx) {
    const input = ctx.request.body;

    try {
      await validateProfileUpdateInput(input);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const updatedUser = await strapi.plugins['users-permissions'].services.user.edit(ctx.state.user.id, input);

    // ctx.body = sanitizeUser(updatedUser);
    return sanitizeUser(updatedUser);
  },
};
