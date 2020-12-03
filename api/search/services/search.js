'use strict';

const fs = require('fs');
const archiver = require('archiver');

module.exports = {
  exportResults: async () => {
    let searches = await strapi.query('search').find({ process: 1 });
    if (searches.length) log('debug', `Found ${searches.length} search job(s)`);
    searches.forEach(async (search) => {
      let start = Date.now();

      let dir = `/public/export/`;
      let path = `${dir}${search.id}.zip`;

      if (fs.existsSync(strapi.dir + path)) {
        log('debug', `Export already exists for ${search.id}`);
        strapi
          .query('search')
          .update({ id: search.id }, { process: 0, path: path });
        return;
      }
      if (!fs.existsSync(strapi.dir + dir)) fs.mkdirSync(strapi.dir + dir);

      log('debug', `Generating search export for ${search.id}`);
      const results = await strapi.services['query'].exportResults(
        search.filters
      );

      let daysExpire = 30;
      let expires = new Date();
      expires.setDate(expires.getDate() + daysExpire);

      const output = fs.createWriteStream(`${strapi.dir}${path}`);
      const archive = archiver('zip');

      output.on('close', async () => {
        await strapi.query('search').update(
          { id: search.id },
          {
            process: 0,
            processed: Date.now(),
            expires: expires,
            path: path,
          }
        );
        log(
          'debug',
          `Search results generated, ${archive.pointer()} total bytes`,
          start
        );

        // send email notification
        await strapi.plugins['email'].services.email.send({
          to: search.user.email,
          subject: 'DataARC Search Results',
          html: `<h1>DataARC</h1><p>Your search results have been successfully generated. You can download the file from your profile or by clicking the link below. These results will expire and automatically be removed in ${daysExpire} days.</p><p>Download Results: <a href="https://api.data-arc.org${path}">https://api.data-arc.org${path}</a></p>`,
        });
      });
      output.on('error', (err) => {
        log('error', err);
      });

      archive.pipe(output);
      archive.append(JSON.stringify(results, null, 2), {
        name: 'results.json',
      });
      archive.finalize();
    });
  },

  // remove expired searches
  removeExpired: async () => {
    let searches = await strapi
      .query('search')
      .find({ expires_lt: Date.now() });
    if (searches.length)
      log('debug', `Found ${searches.length} expired search(es)`);
    else return;
    searches.forEach((search) => {
      fs.unlink(`${strapi.dir}${search.path}`, (err) => {
        log('debug', `Export removed for ${search.id}`);
        strapi
          .query('search')
          .update({ id: search.id }, { expires: null, path: null });
      });
    });
  },
};

// simple log function with time calculation
const log = (type, msg, time = '') => {
  type = type || 'debug';
  if (time) time = ` (${Math.ceil(Date.now() - time)} ms)`;
  strapi.log[type](`${msg}${time}`);
};
