module.exports = ({ env }) => ({
  graphql: {
    endpoint: '/graphql',
    tracing: false,
    shadowCRUD: true,
    playgroundAlways: false,
    depthLimit: 7,
    amountLimit: 100,
  },
  email: {
    provider: 'smtp',
    providerOptions: {
      host: env('SMTP_HOST', 'smtp.gmail.com'),
      port: env.int('SMTP_PORT', 465),
      secure: env.bool('SMTP_SECURE', true),
      username: env('SMTP_USERNAME', 'mail@data-arc.org'),
      password: env('SMTP_PASSWORD', ''),
      requireTLS: env.bool('SMTP_TLS', true),
      connectionTimeout: env.int('SMTP_TIMEOUT', 1),
    },
    settings: {
      from: env('SMTP_FROM', 'DataARC <no-reply@data-arc.org>'),
    },
  },
});
