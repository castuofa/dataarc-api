module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('URL', ''),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', 'c7b82daba71bb4fa33742725974a8f48'),
    },
  },
});
