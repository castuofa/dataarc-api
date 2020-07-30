'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
  /**
   * Create a record.
   *
   * @return {Object}
   */

  async create(ctx) {
    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services['concept-map'].create(data, { files });
    } else {
      entity = await strapi.services['concept-map'].create(ctx.request.body);
    }
    let entry = sanitizeEntity(entity, {
      model: strapi.models['concept-map'],
    });

    strapi.services.event.log(
      'update',
      strapi.models['concept-map'].info.name,
      entry.name,
      ctx.state.user.id
    );

    return entry;
  },

  /**
   * Update a record.
   *
   * @return {Object}
   */

  async update(ctx) {
    const { id } = ctx.params;

    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services['concept-map'].update({ id }, data, {
        files,
      });
    } else {
      entity = await strapi.services['concept-map'].update(
        { id },
        ctx.request.body
      );
    }

    let entry = sanitizeEntity(entity, {
      model: strapi.models['concept-map'],
    });

    strapi.services.event.log(
      'update',
      strapi.models['concept-map'].info.name,
      entry.name,
      ctx.state.user.id
    );

    return entry;
  },

  /**
   * delete a record.
   *
   * @return {Object}
   */

  async delete(ctx) {
    const { id } = ctx.params;

    const entity = await strapi.services['concept-map'].delete({ id });

    let entry = sanitizeEntity(entity, {
      model: strapi.models['concept-map'],
    });

    strapi.services.event.log(
      'update',
      strapi.models['concept-map'].info.name,
      entry.name,
      ctx.state.user.id
    );

    return entry;
  },

  /**
   * process a concept map
   *
   * @return {Object}
   */

  async process(ctx) {
    const { id } = ctx.params;

    const entity = await strapi.services['concept-map'].findOne({ id });
    let entry = sanitizeEntity(entity, { model: strapi.models['concept-map'] });

    strapi.log.info(`Processing concept map ${JSON.stringify(entry)}`);

    const convert = require('xml-js');
    const fs = require('fs');

    // read file
    const xmlFile = fs.readFileSync(`../public${entry.url}`, 'utf8');

    // parse xml file as a json object
    const jsonData = JSON.parse(
      convert.xml2json(xmlFile, { compact: true, spaces: 2 })
    );

    strapi.log.info(`JSON data: ${JSON.stringify(jsonData)}`);

    // const targetNode =

    //     // element '/stats/runs/latest'
    //     jsonData.stats.runs.latest

    //     .find(x =>

    //         // attribute '@date'
    //         x._attributes.date === '2019-12-12'
    //     );

    // targetNode has the 'latest' node we want
    // now output the 'fail' attribute from that node
    // console.log(targetNode._attributes.fail);  // outputs: 2

    // load the file

    // loop through topics and create new entries

    // let entry = sanitizeEntity(entity, {
    //   model: strapi.models['concept-map'],
    // });

    // strapi.services.event.log(
    //   'process',
    //   strapi.models['concept-map'].info.name,
    //   entry.name,
    //   ctx.state.user.id
    // );

    return entry;
  },
};
