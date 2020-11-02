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
    provider: 'smtp',
    providerOptions: {
      host: 'smtp-relay.gmail.com',
      port: 465,
      secure: true,
      requireTLS: true,
      connectionTimeout: 1,
    },
    settings: {
      from: 'mail@cast.uark.edu',
    },
  },
};
