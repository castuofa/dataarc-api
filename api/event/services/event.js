'use strict';

module.exports = {
  // log an event
  log: async (event) => {
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
  log_ctx: async (type, ctx, details) => {
    let event = {};
    event.type = type;
    event.controller = strapi.services.helper.ctx_controller(ctx);
    event.action = strapi.services.helper.ctx_action(ctx);
    event.item = strapi.services.helper.ctx_item(ctx);
    event.user = strapi.services.helper.ctx_user(ctx);
    event.payload = strapi.services.helper.ctx_payload(ctx);
    strapi.services.event.log(event);
  },

  // shortcut to log an info event using ctx
  info: async (ctx, details) => {
    strapi.services.event.log_ctx('info', ctx, details);
  },

  // shortcut to log an warn event using ctx
  warn: async (ctx, details) => {
    strapi.services.event.log_ctx('warning', ctx, details);
  },

  // shortcut to log an error event using ctx
  error: async (ctx, details) => {
    strapi.services.event.log_ctx('error', ctx, details);
  },

  // shortcut to log a create event for lifecycles
  lifecycle_create: async (info, result, data) => {
    if (result == null) return;
    let event = {};
    event.type = 'info';
    event.controller = info.name;
    event.action = 'create';
    event.item = result[info.field];
    if (result.updated_by) event.user = result.updated_by.id;
    event.payload = { data };
    strapi.services.event.log(event);
  },

  // shortcut to log an update event for lifecycles
  lifecycle_update: async (info, result, params, data) => {
    if (result == null) return;
    let event = {};
    event.type = 'info';
    event.controller = info.name;
    event.action = 'update';
    event.item = result[info.field];
    if (result.updated_by) event.user = result.updated_by.id;
    event.payload = { params, data };
    strapi.services.event.log(event);
  },

  // shortcut to log a delete event for lifecycles
  lifecycle_delete: async (info, result, params) => {
    if (result == null) return;
    let event = {};
    event.type = 'info';
    event.controller = info.name;
    event.action = 'delete';
    event.item = result[info.field];
    if (result.updated_by) event.user = result.updated_by.id;
    event.payload = { params };
    strapi.services.event.log(event);
  },
};
