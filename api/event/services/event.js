'use strict';

const chalk = require('chalk');
const pluralize = require('pluralize');

const actionToColor = (action) => {
  return action.match(/create/i)
    ? chalk.green(action)
    : action.match(/update/i)
    ? chalk.yellow(action)
    : action.match(/delete/i)
    ? chalk.red(action)
    : action.match(/process/i)
    ? chalk.cyan(action)
    : action.match(/refresh/i)
    ? chalk.magenta(action)
    : chalk.white(action);
};

module.exports = {
  // store an event
  store: async (event) => {
    event = event || {};
    if (
      !event.type ||
      !event.action ||
      !event.controller ||
      !event.document ||
      !event.name
    )
      return;

    // store event
    return strapi
      .query('event')
      .create(event)
      .catch((err) => {
        strapi.log.error(
          `${err.status}: event log error for ${event.type}:${event.action}`
        );
      });
  },

  // log an event to the console
  log: async (event) => {
    event = event || {};
    if (
      !event.type ||
      !event.action ||
      !event.controller ||
      !event.document ||
      !event.name
    )
      return;
    event.controller = pluralize.plural(event.controller);
    strapi.log[event.type === 'info' ? 'debug' : event.type](
      `${actionToColor(event.action)} /${event.controller}/${event.document} (${
        event.name
      })`
    );
  },

  // shortcut to log controller events
  controller: async (info, entity, ctx, opts) => {
    if (!info || !entity || !ctx) return;
    opts = opts || {};
    opts.store = opts.store || true;
    let event = {};
    event.type = opts.type || 'info';
    if (ctx.params) {
      let path = ctx.params[0].split('/');
      if (path.length >= 2) event.action = path[1];
      if (path.length >= 1) event.controller = path[0];
    }
    event.document = entity.id;
    event.name = entity[info.field];
    if (opts.details) event.details = opts.details;
    if (opts.payload) event.payload = opts.payload;
    if (ctx.state && ctx.state.user) event.user = ctx.state.user.id;

    // log the event
    strapi.services['event'].log(event);

    // store the event
    if (opts.store) strapi.services['event'].store(event);
  },

  // shortcut to log lifecycle events
  lifecycle: async (action, info, entity, opts) => {
    if (!action || !info || !entity) return;
    opts = opts || {};
    opts.store = opts.store || true;
    let event = {};
    event.type = opts.type || 'info';
    event.action = action;
    event.controller = info.name;
    event.document = entity.id;
    event.name = entity[info.field];
    if (opts.details) event.details = opts.details;
    if (opts.payload) {
      event.payload = opts.payload;
      if (opts.payload.data && opts.payload.data.updated_by)
        event.user = opts.payload.data.updated_by;
    }

    // log the event
    strapi.services['event'].log(event);

    // store the event
    if (opts.store) strapi.services['event'].store(event);
  },
};
