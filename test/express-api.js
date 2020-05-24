const express = require('express');
const apiRouter = require('./express-routes/index.js');

const app = express();
app.disable('etag');
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use('/v1', apiRouter);
app.get('/_ah/health', (req, res) => {
  res.status(200).send('ok');
});
// Basic 404 handler
app.use((req, res) => {
  res.status(404).send('Not Found');
});
// Basic error handler
app.use((err, req, res) => {
  /* jshint unused:false */
  res.status(500).send({
    error: true,
    message: err.response || 'Something is wrong...',
  });
});
let server;
module.exports.startServer = (port) =>
  new Promise((resolve) => {
    server = app.listen(port, () => resolve());
  });
module.exports.stopServer = () =>
  new Promise((resolve) => {
    server.close(() => resolve());
  });
