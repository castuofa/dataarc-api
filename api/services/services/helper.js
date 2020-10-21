'use strict';

/**
 * `helper` service.
 */

const _ = require('lodash');
const fs = require('fs');
const slugify = require('slugify');

module.exports = {
  find_unique: async ({ content_type, field, value }) => {
    let name = await strapi.services.helper.get_name(value);

    // if it doesn't exist we found one
    const exists = await strapi.services.helper.check_availability({
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
    return strapi.services.helper
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

  // clean up old files from uploads
  clean_uploads: () => {
    let dir = `${strapi.dir}/public/uploads`;
    let path = require('path');
    fs.readdir(dir, function (err, files) {
      files.forEach(function (file, index) {
        fs.stat(path.join(dir, file), function (err, stat) {
          var endTime, now;
          if (err) strapi.log.error(err);
          now = new Date().getTime();
          endTime = new Date(stat.ctime).getTime() + 60000;
          if (now > endTime) {
            fs.unlink(path.join(dir, file), (err) => {
              if (err) strapi.log.error(err);
              strapi.log.debug(`Expired file removed from uploads: ${file}`);
            });
          }
        });
      });
    });
  },

  // load a json file
  load_json: (path) => {
    request({
      url:
        'https://raw.githubusercontent.com/castuofa/dataarc-source/main/datasets/test/test_large_dataset.json',
    })
      .pipe(JSONStream.parse('*'))
      .pipe(
        es.mapSync((data) => {
          console.log(data);
          return data;
        })
      );
    return;
    // const https = require('follow-redirects').https;
    // let options = {
    //   host: 'raw.githubusercontent.com',
    //   port: 443,
    //   path: `/castuofa/dataarc-source/main/${path}`,
    //   method: 'GET',
    //   rejectUnauthorized: false,
    //   requestCert: true,
    //   agent: false,
    // };
    // let random = [...Array(16)]
    //   .map((i) => (~~(Math.random() * 36)).toString(36))
    //   .join('');
    // let extension = /(?:\.([^.]+))?$/.exec(options.path)[1];
    // let filename = `${random}.${extension}`;
    // let file = fs.createWriteStream(`${strapi.dir}/public/uploads/${filename}`);
    // let request = https.get(options, function (response) {
    //   response.pipe(file);
    //   file.on('finish', function () {
    //     file.close();
    //   });
    // });
    // request.end();
    // strapi.services.helper.clean_uploads();
    // request.on('error', function (err) {
    //   throw err;
    // });
    // // read the file syncronously
    // let contents = fs.readFileSync(path, 'utf8');
    // // remove strange characters
    // contents = contents.trim();
    // // parse json
    // source = JSON.parse(contents);
    // return source;
  },

  // set the state for a collection based on params
  set_state: async (params, collection, state, msg = '') => {
    if (!params || !collection || !state) return null;
    if (strapi.services.helper.get_type(params) != 'object') {
      params = { id: params };
    }
    return strapi
      .query(collection)
      .update(params, {
        state: state,
        state_msg: msg,
        state_at: Date.now(),
      })
      .catch(function (err) {
        switch (err.status) {
          case 404:
            strapi.log.warn(
              `${collection} state not updated, no matching results`
            );
            break;
          default:
            strapi.log.warn(
              `${collection} state not updated, error ${err.status}`
            );
            break;
        }
      });
  },

  // log an event
  log: async (event = {}) => {
    //   type,
    //   controller,
    //   action,
    //   item,
    //   details,
    //   payload,
    //   user,
    strapi.services.event.create(event).catch(function (err) {
      strapi.log.warn(`${err.status}: event log error for ${type}:${action}`);
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

  // directly access the mongoose model to perform bulk actions
  delete_many: async (collection, filter, options, callback) => {
    return strapi.query(collection).model.deleteMany(filter, options, callback);
  },

  // directly access the mongoose model to perform bulk actions
  insert_many: async (collection, docs, options, callback) => {
    return strapi.query(collection).model.insertMany(docs, options, callback);
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
    let role = await strapi.services.helper.get_role(params.type);
    if (!role) {
      strapi.log.warn(`Creating ${params.name} role.`);
      await strapi.query('role', 'users-permissions').create(params);
      role = await strapi.services.helper.get_role(params.type);
    }
    return role;
  },

  // set permission for given: role,type,controller,action
  set_permission: async (role, type, controller, action, enabled) => {
    try {
      // const role = await strapi.services.helper.get_role(role);
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
    let role = await strapi.services.helper.get_role(role_type);
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
