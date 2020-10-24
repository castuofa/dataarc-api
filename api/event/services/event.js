'use strict';

const chalk = require('chalk');
const pluralize = require('pluralize');

const actionToColor = (action) => {
  return action == 'CREATE'
    ? chalk.green(action)
    : action == 'UPDATE'
    ? chalk.blue(action)
    : action == 'DELETE'
    ? chalk.red(action)
    : action == 'PROCESS'
    ? chalk.yellow(action)
    : action == 'REFRESH'
    ? chalk.cyan(action)
    : action;
};

module.exports = {
  // log an event
  log: async (event) => {
    let msg = `${actionToColor(event.action.toUpperCase())} /${pluralize.plural(
      event.controller
    )}/${event.document}`;
    if (event.type == 'info') strapi.log.debug(msg);
    else strapi.log[event.type](msg);
    strapi
      .query('event')
      .create(event)
      .catch((err) => {
        strapi.log.error(
          `${err.status}: event log error for ${event.type}:${event.action}`
        );
      });
  },

  // log an event with ctx
  log_ctx: async ({ type, info, ctx, details }) => {
    let event = {};
    event.type = type;
    event.controller = strapi.services.helper.ctx_controller(ctx);
    event.action = strapi.services.helper.ctx_action(ctx);
    event.document = strapi.services.helper.ctx_id(ctx);
    event.user = strapi.services.helper.ctx_userid(ctx);
    let entity = await strapi
      .query(event.controller)
      .findOne({ id: event.document });
    event.name = entity[info.field];
    event.details = details;
    strapi.services.event.log(event);
  },

  // shortcut to log an info event using ctx
  info: async ({ info, ctx, details }) => {
    strapi.services.event.log_ctx({ type: 'info', info, ctx, details });
  },

  // shortcut to log an warn event using ctx
  warn: async ({ info, ctx, details }) => {
    strapi.services.event.log_ctx({ type: 'warn', info, ctx, details });
  },

  // shortcut to log an error event using ctx
  error: async ({ info, ctx, details }) => {
    strapi.services.event.log_ctx({ type: 'error', info, ctx, details });
  },

  // shortcut to log a create event for lifecycles
  lifecycle_create: async ({ info, result, data }) => {
    if (result == null) return;
    let event = {};
    event.type = 'info';
    event.controller = info.name;
    event.action = 'create';
    event.document = result.id;
    event.name = result[info.field];
    if (data.updated_by) event.user = data.updated_by;
    event.payload = { data };
    strapi.services.event.log(event);
  },

  // shortcut to log an update event for lifecycles
  lifecycle_update: async ({ info, result, params, data }) => {
    if (result == null) return;
    let event = {};
    event.type = 'info';
    event.controller = info.name;
    event.action = 'update';
    event.document = result.id;
    event.name = result[info.field];
    if (data.updated_by) event.user = data.updated_by;
    event.payload = { params, data };
    strapi.services.event.log(event);
  },

  // shortcut to log a delete event for lifecycles
  lifecycle_delete: async ({ info, result, params }) => {
    if (result == null) return;
    let event = {};
    event.type = 'info';
    event.controller = info.name;
    event.action = 'delete';
    event.document = result.id;
    event.name = result[info.field];
    if (result.updated_by) event.user = result.updated_by.id;
    console.log(result);
    event.payload = { params };
    strapi.services.event.log(event);
  },
};
