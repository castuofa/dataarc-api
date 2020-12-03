'use strict';

const fs = require('fs');
const archiver = require('archiver');

module.exports = {
  exportResults: async () => {
    let searches = await strapi.query('search').find({ process: 1 });
    if (searches.length) log('debug', `Found ${searches.length} search job(s)`);
    searches.forEach(async search => {
      let start = Date.now();

      let dir = `${strapi.dir}/public/export/`;
      let filename = `${search.id}.zip`;

      if (fs.existsSync(dir+filename)) {
        log('debug', `Export already exists for ${search.id}`);
        strapi.query('search').update({ id: search.id }, { process: 0, filename: filename });
        return;
      }
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);

      log('debug', `Generating search export for ${search.id}`);
      const results = await strapi.services['query'].exportResults(search.filters);

      let expires = new Date();
      expires.setDate(expires.getDate() + 30);

      const output = fs.createWriteStream(`${dir}${filename}`);
      const archive = archiver('zip');

      output.on('close', async () => {
        await strapi.query('search').update({ id: search.id }, { process: 0, processed: Date.now(), expires: expires, filename: filename });
        log('debug', `Search results generated, ${archive.pointer()} total bytes`, start);

        // send email notification
        await strapi.plugins['email'].services.email.send({
          to: search.user.email,
          from: 'no-reply@data-arc.org',
          subject: 'DataARC Search Results',
          html: `<h1>DataARC</h1><p>Your search results have been successfully generated. You can download them from your profile or by clicking the link below.</p><p>Download Results: <a href="https://api.data-arc.org${dir}${filename}">https://api.data-arc.org${dir}${filename}</a></p>`,
        });
      });
      output.on('error', (err) => {
        log('error', err)
      });

      archive.pipe(output);
      archive.append(JSON.stringify(results, null, 2), { name: 'results.json' });
      archive.finalize();
    });
  },

  // remove expired searches
  removeExpired: async () => {
    let searches = await strapi.query('search').find({ expires_lt: Date.now() });
    if (searches.length) log('debug', `Found ${searches.length} expired search(es)`);
    else return;
    searches.forEach(search => {
      let dir = `${strapi.dir}/public/export/`;
      fs.unlink(`${dir}${search.filename}`, (err) => {
        log('debug', `Export removed for ${search.id}`);
        strapi.query('search').update({ id: search.id }, { expires: null, filename: null });
      });
    });
  }
};

// simple log function with time calculation
const log = (type, msg, time = '') => {
  type = type || 'debug';
  if (time) time = ` (${Math.ceil(Date.now() - time)} ms)`;
  strapi.log[type](`${msg}${time}`);
};
