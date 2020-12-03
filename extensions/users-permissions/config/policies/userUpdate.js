'use strict';

const { yup, formatYupErrors } = require('strapi-utils');

const handleReject = (error) => Promise.reject(formatYupErrors(error));

const profileUpdateSchema = yup
  .object()
  .shape({
    username: yup.string().min(1).notNull(),
    email: yup.string().email().lowercase().notNull(),
    password: yup
      .string()
      .min(8)
      .matches(/[a-z]/, '${path} must contain at least one lowercase character')
      .matches(/[A-Z]/, '${path} must contain at least one uppercase character')
      .matches(/\d/, '${path} must contain at least one number')
      .notNull(),
    firstName: yup.string(),
    lastName: yup.string(),
  })
  // Won't let users update relations
  .noUnknown();

const validateProfileUpdateInput = (data) => {
  return profileUpdateSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleReject);
};

module.exports = async (ctx, next) => {
  // If the user is an administrator we allow them to perform this action unrestricted
  if (ctx.state.user.role.name === "Administrator") {
    return next();
  }

  // Get the target user id and the the updating users id
  const { id: currentUserId } = ctx.state.user;
  const userToUpdate = ctx.params.id;

  // Make sure current user can only update their own profile
  if (currentUserId !== userToUpdate) {
    return ctx.unauthorized("Unable to edit this user");
  }

  // Retrieve the input
  const input = ctx.request.body;

  // Validate the input
  try {
    await validateProfileUpdateInput(input);
  } catch (err) {
    return ctx.badRequest('Validation error', err);
  }

  // continue to update
  return next();
};
