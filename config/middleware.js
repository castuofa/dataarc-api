module.exports = {
  load: {
    before: ['timer', 'responseTime', 'logger', 'cors', 'responses', 'gzip'],
    after: ['parser', 'router'],
  },
  settings: {
    cors: {
      enabled: true,
      origin: [
        'https://admin.data-arc.org',
        'https://beta.data-arc.org',
        'http://localhost',
      ],
    },
    logger: {
      level: 'debug',
      exposeInContext: true,
      requests: false,
    },
    gzip: {
      enabled: true,
    },
    responseTime: {
      enabled: true,
    },
    poweredBy: {
      enabled: false,
    },
    timer: {
      enabled: true,
    },
  },
};
