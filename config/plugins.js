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
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      username: 'mail@data-arc.org',
      password: 'haumexmwzlhpttbi',
      requireTLS: true,
      connectionTimeout: 1,
    },
    settings: {
      from: 'DataARC <no-reply@data-arc.org>',
    },
  },
};
