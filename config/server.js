module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('URL', ''),
  admin: {
    url: env('ADMIN_URL', '/admin'),
    serveAdminPanel: env('ADMIN_PANEL', false),
    autoOpen: false,
    auth: {
      secret: env('ADMIN_JWT_SECRET', undefined),
    },
  },
});
