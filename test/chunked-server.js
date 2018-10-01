const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');

const Chance = require('chance');
const chance = new Chance();

const srvs = {
  srv: undefined,
  ssl: undefined
};

require('ssl-root-cas')
.inject()
.addFile(path.join('test', 'certs', 'ca.cert.pem'));
/**
 * Writes a chaunk of data to the response.
 *
 * @param {Object} res Node's response object
 */
function writeChunk(res) {
  res.write(chance.word({length: 128}) + '\n');
}
/**
 * Writes chunk type response to the client.
 *
 * @param {Object} res Node's response object
 */
function writeChunkedResponse(res) {
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=UTF-8',
    'Transfer-Encoding': 'chunked'
  });
  writeChunk(res);
  let time = 0;
  for (let i = 0; i < 4; i++) {
    let timeout = chance.integer({min: 1, max: 10});
    time += timeout;
    setTimeout(writeChunk.bind(this, res), timeout);
  }
  time += 5;
  setTimeout(function() {
    res.end('END');
  }, time);
}
/**
 * Callback for client connection.
 *
 * @param {[type]} req Node's request object
 * @param {Object} res Node's response object
 */
function connectedCallback(req, res) {
  writeChunkedResponse(res);
}
/**
 * Callback for client connection over SSL.
 *
 * @param {[type]} req Node's request object
 * @param {Object} res Node's response object
 */
function connectedSslCallback(req, res) {
  writeChunkedResponse(res);
}

let lastSocketKey = 0;
let socketMap = {};
function handleConnection(socket) {
  const socketKey = ++lastSocketKey;
  socketMap[socketKey] = socket;
  socket.on('close', () => {
    delete socketMap[socketKey];
  });
}

function startHttpServer(httpPort) {
  return new Promise((resolve) => {
    srvs.srv = http.createServer(connectedCallback);
    srvs.srv.listen(httpPort, () => resolve());
    srvs.srv.on('connection', handleConnection);
  });
}

function startHttpsServer(sslPort) {
  return new Promise((resolve) => {
    const options = {
      key: fs.readFileSync(path.join('test', 'certs', 'privkey.pem')),
      cert: fs.readFileSync(path.join('test', 'certs', 'fullchain.pem'))
    };
    srvs.ssl = https.createServer(options, connectedSslCallback);
    srvs.ssl.listen(sslPort, () => resolve());
    srvs.ssl.on('connection', handleConnection);
  });
}

exports.startServer = function(httpPort, sslPort) {
  return Promise.all([
    startHttpServer(httpPort),
    startHttpsServer(sslPort)
  ]);
};

exports.stopServer = function() {
  Object.keys(socketMap).forEach((socketKey) => {
    if (socketMap[socketKey].destroyed) {
      return;
    }
    socketMap[socketKey].destroy();
  });
  const p1 = new Promise((resolve) => {
    srvs.srv.close(() => resolve());
  });
  const p2 = new Promise((resolve) => {
    srvs.ssl.close(() => resolve());
  });
  return Promise.all([p1, p2]);
};
