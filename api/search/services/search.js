'use strict';

const fs = require('fs');
const archiver = require('archiver');
const { resolve } = require('path');

module.exports = {
  exportResults: async () => {
    const search = await strapi
      .query('search')
      .model.findOneAndUpdate(
        { process: true, busy: false },
        { $set: { busy: true } }
      );
    if (search) {
      let start = Date.now();
      log('debug', `Found search job for ${search.id}`);

      let dir = `/public/export/`;
      let file = `${search.id}.zip`;
      let fs_path = `${dir}${file}`;
      let url_path = `/export/${file}`;

      if (fs.existsSync(strapi.dir + fs_path)) {
        log('debug', `Export already exists for ${search.id}`);
        strapi
          .query('search')
          .update(
            { id: search.id },
            { process: false, busy: false, path: url_path }
          );
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

      const output = fs.createWriteStream(`${strapi.dir}${fs_path}`);
      const archive = archiver('zip');

      output.on('close', async () => {
        await strapi.query('search').update(
          { id: search.id },
          {
            process: false,
            busy: false,
            processed: Date.now(),
            expires: expires,
            path: url_path,
          }
        );
        log(
          'debug',
          `Search results generated, ${archive.pointer()} total bytes`,
          start
        );

        let user = await strapi
          .query('user', 'users-permissions')
          .findOne({ id: search.user });

        const emailTemplate = {
          subject: 'DataARC Search Results',
          text: `DataARC
            Your search results have been successfully generated. You can download the file from your profile or by clicking the link below. These results will expire and automatically be removed in <%= daysExpire %> days.
            Download Results: <%= fullPath %>`,
          html: `<h1>DataARC</h1>
            <p>Your search results have been successfully generated. You can download the file from your profile or by clicking the link below. These results will expire and automatically be removed in <%= daysExpire %> days.</p>
            <p>Download Results: <a href="<%= fullPath %>"><%= fullPath %></a></p>`,
        };

        // send email notification
        await strapi.plugins['email'].services.email.sendTemplatedEmail(
          {
            to: user.email,
          },
          emailTemplate,
          {
            fullPath: process.env.URL + url_path,
            daysExpire: daysExpire,
          }
        );
      });
      output.on('error', (err) => {
        log('error', err);
      });

      archive.pipe(output);
      archive.append(JSON.stringify(results, null, 2), {
        name: 'results.json',
      });
      archive.finalize();
    } else {
      log('debug', `No searches to process`);
    }
  },

  // remove expired searches
  removeExpired: async () => {
    let searches = await strapi
      .query('search')
      .find({ expires_lt: Date.now() });
    if (searches.length)
      log('debug', `Found ${searches.length} expired search(es)`);
    else return;
    for (const search of searches) {
      fs.unlink(`${strapi.dir}${search.path}`, (err) => {
        log('debug', `Export removed for ${search.id}`);
        strapi
          .query('search')
          .update({ id: search.id }, { expires: null, path: null });
      });
    }
  },
};

// simple log function with time calculation
const log = (type, msg, time = '') => {
  type = type || 'debug';
  if (time) time = ` (${Math.ceil(Date.now() - time)} ms)`;
  strapi.log[type](`${msg}${time}`);
};
