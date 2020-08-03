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
    const entry = await strapi.query('topic-map').findOne(params);

    if (entry != null) {
      strapi.log.info(`Processing topic map ${JSON.stringify(entry)}`);

      const fs = require('fs');

      // read file
      const path = `${strapi.dir}/public${entry.source.url}`;
      // const path = `${strapi.dir}/../dataarc-data/source/topic-map/topic_nodes_old.json`;
      const map = JSON.parse(fs.readFileSync(path, 'utf8'));

      strapi.log.info(`JSON data: ${JSON.stringify(map.links)}`);

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
      //   model: strapi.models['topic-map'],
      // });

      // strapi.services.event.log(
      //   'process',
      //   strapi.models['topic-map'].info.name,
      //   entry.name,
      //   ctx.state.user.id
      // );
    }

    return entry;
  },
};
