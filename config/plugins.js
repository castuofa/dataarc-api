module.exports = {
  graphql: {
    endpoint: '/graphql',
    tracing: false,
    shadowCRUD: true,
    playgroundAlways: false,
    depthLimit: 7,
    amountLimit: 100,
  },
  email: {
    provider: 'sendmail',
    providerOptions: {
      smtpHost: 'smtp-relay.gmail.com',
      smtpPort: 25,
    },
    settings: {
      defaultFrom: 'DataARC <mail@data-arc.org>',
    },
  },
};
