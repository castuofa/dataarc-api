'use strict';

/**
 * `helper` service.
 */

const _ = require('lodash');
const slugify = require('slugify');
const chalk = require('chalk');

const codeToColor = (code) => {
  return code >= 500
    ? chalk.red(code)
    : code >= 400
    ? chalk.yellow(code)
    : code >= 300
    ? chalk.cyan(code)
    : code >= 200
    ? chalk.green(code)
    : code;
};

module.exports = {
  find_unique: async ({ content_type, field, value }) => {
    let name = await strapi.services['helper'].get_name(value);

    // if it doesn't exist we found one
    const exists = await strapi.services['helper'].check_availability({
      content_type: content_type,
      field: field,
      value: name,
    });
    if (!exists) return name;

    // find possible colisions
    const possibleColisions = await strapi
      .query(content_type)
      .find({
        [`${field}_contains`]: name,
        _limit: -1,
      })
      .then((results) => results.map((result) => result[field]));
    if (possibleColisions.length === 0) return name;

    // loop through the possible collisions until we find a unique name
    let i = 1;
    let tmpName = `${name}_${i}`;
    while (possibleColisions.includes(tmpName)) {
      i += 1;
      tmpName = `${name}_${i}`;
    }
    return tmpName;
  },

  // check the content type for a field that matches the value given
  check_availability: ({ content_type, field, value }) => {
    let count = strapi.query(content_type).count({
      [field]: value,
    });
    if (count > 0) return false;
    return true;
  },

  // get the type of the property
  get_type: (prop) => {
    return Object.prototype.toString
      .call(prop)
      .match(/\s([a-zA-Z]+)/)[1]
      .toLowerCase();
  },

  // parse string value to primitive
  parse_primitive: (value) => {
    try {
      return JSON.parse(value);
    } catch (err) {
      return value.toString();
    }
  },

  // get an seo friendly keyword
  get_keyword: (value) => {
    return strapi.services['helper']
      .get_name(
        value
          .replace(/https?:\/\/(www\.)?/g, '')
          .replace(
            /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
            ''
          ),
        ' '
      )
      .replace(/\d+/g, ' ')
      .replace(/\s\s+/g, ' ')
      .trim();
  },

  // get an seo friendly name
  get_name: (
    words,
    wordSeparator = '_',
    pathSeparator = '_',
    nestedIndicator = ' --> '
  ) => {
    return words
      .split(nestedIndicator)
      .map((word) => {
        return slugify(word.replace(/[\/\\\-_*+~.()'"!:@\?\s+]/g, ' '), {
          replacement: wordSeparator,
          lower: true,
          strict: true,
          remove: /[\/\\*+~.()'"!:@\?]/g,
        });
      })
      .join(pathSeparator);
  },

  // get a clean title
  get_title: (path) => {
    return path
      .replace(/[\[\]-_.]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\w\S*/g, (s) => {
        return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase();
      });
  },

  // check if any of the fields are in the data
  has_fields: (fields, data) => {
    return _.intersection(_.keys(data), fields).length > 0;
  },

  // stream source, parse json, run function
  stream_json: async ({ source, pattern, process, after, error }) => {
    const fetch = require('node-fetch');
    const JSONStream = require('JSONStream');

    let url = `https://raw.githubusercontent.com/castuofa/dataarc-source/main/${source}`;
    let start = Date.now();
    let count = 0;

    if (!pattern) pattern = '*';
    if (!process)
      process = (data) => {
        return data;
      };
    if (!after) after = () => {};
    if (!error)
      error = (err) => {
        strapi.log.error(err.message);
      };

    // validate our results are OK or throw an error
    let validate = (res) => {
      let delta = Math.ceil(Date.now() - start);
      strapi.log.debug(
        `REQUEST ${source} (${delta} ms) ${codeToColor(res.status)}`
      );
      if (res.ok) return res;
      else throw new Error(res.status);
    };

    // track stream progress
    let track = (data) => {
      count++;
      return data;
    };

    // wrap things up
    let end = (data) => {
      let delta = Math.ceil(Date.now() - start);
      let items = chalk.cyan(`${count} items`);
      strapi.log.debug(
        `PROCESS ${source} ${items} (${delta} ms) ${chalk.green('DONE')}`
      );
    };

    // fetch, validate, process
    return fetch(url)
      .then(validate)
      .then((res) => {
        res.body.pipe(
          JSONStream.parse(pattern)
            .on('error', error)
            .on('data', track)
            .on('data', process)
            .on('end', end)
            .on('end', after)
        );
      });
  },

  // convert graphql parameters to rest equivilent
  prefix_graphql_params: async (params) => {
    let fixed = {};
    _.each(params, (value, key) => {
      fixed['_' + key] = value;
    });
    return fixed;
  },

  // get a role based given a type {string}
  get_role: async (type) => {
    const service = await strapi.plugins['users-permissions'].services
      .userspermissions;
    const plugins = await service.getPlugins('en');
    const roles = await service.getRoles();
    try {
      const { id } = _.find(roles, (x) => x.type === type);
      return service.getRole(id, plugins);
    } catch (err) {
      return;
    }
  },

  // get or create the role if its missing
  get_or_create_role: async (params) => {
    let role = await strapi.services['helper'].get_role(params.type);
    if (!role) {
      strapi.log.warn(`Creating ${params.name} role.`);
      await strapi.query('role', 'users-permissions').create(params);
      role = await strapi.services['helper'].get_role(params.type);
    }
    return role;
  },

  // set permission for given: role,type,controller,action
  set_permission: async (role, type, controller, action, enabled) => {
    try {
      // const role = await strapi.services['helper'].get_role(role);
      role.permissions[type].controllers[controller][action].enabled = enabled;
    } catch (err) {
      console.log(`${err}`);
      strapi.log.error(
        `Couldn't set ${role.name} permission ${type}:${controller}:${action}:${enabled}`
      );
    }
  },

  // enable permissions
  enable_permissions: async (role_type, type, controller, actions) => {
    let role = await strapi.services['helper'].get_role(role_type);
    if (!role) return;

    // get target permissions for object
    let permissions = await strapi
      .query('permission', 'users-permissions')
      .find({
        role: role.id,
        type: type,
        controller: controller,
      });
    if (permissions.length == 0) return;

    // loop through the objects permissions setting everything
    _.each(permissions, async (permission) => {
      permission.enabled = actions.includes(permission.action);
      strapi
        .query('permission', 'users-permissions')
        .update({ id: permission.id }, permission);
    });
  },
};
