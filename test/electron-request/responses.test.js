const assert = require('chai').assert;
const { ElectronRequest } = require('../../');
const { ArcHeaders } = require('../../lib/ArcHeaders');
const ExpressServer = require('../express-api.js');

/** @typedef {import('@advanced-rest-client/arc-types').ArcRequest.ArcBaseRequest} ArcBaseRequest */
/** @typedef {import('../../lib/RequestOptions').Options} Options */

describe('Electron request', () => {
  const expressPort = 8125;
  before(async () => {
    // await chunkedServer.startServer(httpPort, sslPort);
    await ExpressServer.startServer(expressPort);
  });

  after(async () => {
    // await chunkedServer.stopServer();
    await ExpressServer.stopServer();
  });

  describe('Responses test', () => {
    [
      ['Image - jpeg', `http://localhost:${expressPort}/v1/image/jpeg`, 'image/jpeg'],
      ['Image - png', `http://localhost:${expressPort}/v1/image/png`, 'image/png'],
      ['Image - svg', `http://localhost:${expressPort}/v1/image/svg`, 'image/svg+xml'],
      ['Image - webp', `http://localhost:${expressPort}/v1/image/webp`, 'image/webp'],
      ['html', `http://localhost:${expressPort}/v1/response/html`, 'text/html; charset=UTF-8'],
      ['json', `http://localhost:${expressPort}/v1/response/json`, 'application/json'],
      ['xml', `http://localhost:${expressPort}/v1/response/xml`, 'application/xml'],
      ['Bytes', `http://localhost:${expressPort}/v1/response/bytes/120`, 'application/octet-stream'],
    ].forEach((item, index) => {
      const [name, url, mime] = item;
      it(`Reads the response: ${name}`, (done) => {
        const id = `r-${index}`;
        const request = new ElectronRequest({
          url,
          method: 'GET',
        }, id);
        request.once('load', (rid, response) => {
          try {
            assert.equal(rid, id, 'has the request id');
            assert.ok(response.payload, 'has the payload');
            const headers = new ArcHeaders(response.headers);
            assert.equal(headers.get('content-type'), mime, 'has the content type');
            const { length } = Buffer.from(response.payload);
            assert.equal(headers.get('content-length'), String(length));
          } catch (e) {
            done(e);
            return;
          }
          done();
        });
        request.once('error', (err) => done(err));
        request.send();
      });
    });
  });

  describe('Compression test', () => {
    [
      ['brotli', `http://localhost:${expressPort}/v1/compression/brotli`, 'br'],
      ['deflate', `http://localhost:${expressPort}/v1/compression/deflate`, 'deflate'],
      ['gzip', `http://localhost:${expressPort}/v1/compression/gzip`, 'gzip'],
    ].forEach((item, index) => {
      const [name, url, enc] = item;
      it(`reads the compressed response: ${name}`, (done) => {
        const id = `r-${index}`;
        const request = new ElectronRequest({
          url,
          method: 'GET',
          headers: `accept-encoding: ${enc}`,
        }, id);
        request.once('load', (rid, response) => {
          try {
            assert.equal(rid, id, 'has the request id');
            assert.ok(response.payload, 'has the payload');
            const headers = new ArcHeaders(response.headers);
            assert.equal(headers.get('content-encoding'), enc, 'has the content-encoding in the response');
            const body = response.payload.toString();
            const data = JSON.parse(body);
            assert.typeOf(data, 'array', 'has the response body');
          } catch (e) {
            done(e);
            return;
          }
          done();
        });
        request.once('error', (err) => done(err));
        request.send();
      });
    });
  });

  describe('Timings tests', () => {
    it('has the stats object', (done) => {
      const request = new ElectronRequest({
        url: `http://localhost:${expressPort}/v1/get`,
        method: 'GET',
      }, 'test');
      request.once('load', (id, response) => {
        assert.typeOf(response.timings, 'object');
        done();
      });
      request.once('error', (err) => done(err));
      request.send();
    });

    ['connect', 'receive', 'send', 'wait', 'dns', 'ssl'].forEach((prop) => {
      it(`Has ${prop} value`, (done) => {
        const request = new ElectronRequest({
          url: `http://localhost:${expressPort}/v1/get`,
          method: 'GET',
        }, 'test');
        request.once('load', (id, response) => {
          assert.typeOf(response.timings[prop], 'number');
          done();
        });
        request.once('error', (err) => done(err));
        request.send();
      });
    });

    it('Has stats time for ssl', (done) => {
      const request = new ElectronRequest({
        url: 'https://www.google.com/',
        method: 'GET',
      }, 'test');
      request.once('load', (id, response) => {
        assert.isAbove(response.timings.ssl, -1);
        done();
      });
      request.once('error', (err) => done(err));
      request.send();
    });
  });
});
