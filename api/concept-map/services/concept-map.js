'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
  /**
   * Promise to process a record
   *
   * @return {Promise}
   */
  async process(params) {
    const entry = await strapi.query('concept-map').findOne(params);
    // const entity = _.first(results) || null;

    if (!entry) return;

    strapi.log.info(`Processing concept map ${JSON.stringify(entry)}`);

    const convert = require('xml-js');
    const fs = require('fs');

    // read file
    const path = `${strapi.dir}/public${entry.file.url}`;
    const xmlFile = fs.readFileSync(path, 'utf8');

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
