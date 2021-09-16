const { ExpressServer } = require('./express-api.js');

const server = new ExpressServer();
server.start().then(() => {
  console.log(`HTTP server: http://localhost:${server.httpPort}/v1/`);
  console.log(`HTTPS server: http://localhost:${server.httpsPort}/v1/`);
});
