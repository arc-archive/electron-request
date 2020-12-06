/* eslint-disable no-console */
const express = require('express');
const bodyParser = require('body-parser');
const formData = require('express-form-data');
const os = require('os');
const apiRouter = require('./express-routes/index.js');

/** @typedef {import('http').Server} Server */
/** @typedef {import('net').Socket} Socket */

const app = express();
app.disable('etag');
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(formData.parse({
  uploadDir: os.tmpdir(),
  autoClean: true,
}));

app.use('/v1', apiRouter);
app.get('/_ah/health', (req, res) => {
  res.status(200).send('ok');
});
// Basic 404 handler
app.use((req, res) => {
  res.status(404).send('Not Found');
});
// // Basic error handler
// app.use((err, req, res) => {
//   /* jshint unused:false */
//   res.status(500).send({
//     error: true,
//     message: err.response || 'Something is wrong...',
//   });
// });
let server = /** @type Server */ (null);
const sockets = [];

module.exports.startServer = (port) =>
  new Promise((resolve) => {
    server = app.listen(port, () => resolve());
    server.on('connection', (socket) => {
      sockets.push(sockets);
      socket.on('close', () => {
        const index = sockets.indexOf(socket);
        sockets.splice(index, 1);
      });
    });
  });
module.exports.stopServer = () =>
  new Promise((resolve) => {
    if (sockets.length) {
      console.error(`There are ${sockets.length} connections when closing the server`);
    }
    // console.log('closing', sockets);
    server.close(() => resolve());
  });
