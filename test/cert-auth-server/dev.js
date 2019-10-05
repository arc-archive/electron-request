const server = require('../cert-auth-server');
const httpPort = 8345;
server.startServer(httpPort);

process.on('SIGINT', async function() {
  console.log('Shuting down server...');
  await server.stopServer();
  process.exit();
});
