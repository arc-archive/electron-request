const { assert } = require('chai');
const { ElectronRequest } = require('../../index.js');
const { untilResponse } = require('../Utils.js');
const ProxyServer = require('../ProxyServer.js');
const { ExpressServer } = require('../express-api.js');


/** @typedef {import('@advanced-rest-client/arc-types').ArcRequest.ArcBaseRequest} ArcBaseRequest */
/** @typedef {import('../../').Options} Options */

describe('Proxying requests', () => {
  const id = 'r-1';
  const httpOpts = /** @type Options */ ({});
  const httpsOpts = /** @type Options */ ({});
  const proxy = new ProxyServer();
  const server = new ExpressServer();
  /** @type string */
  let baseHttpHostname;
  /** @type string */
  let baseHttpsHostname;

  before(async () => {
    await proxy.start();
    await server.start();
    // opts.proxy = '192.168.86.249:8118';
    httpOpts.proxy = `127.0.0.1:${proxy.httpPort}`;
    httpsOpts.proxy = `https://127.0.0.1:${proxy.httpsPort}`;
    baseHttpHostname = `localhost:${server.httpPort}`;
    baseHttpsHostname = `localhost:${server.httpsPort}`;
  });

  after(async () => {
    await proxy.stop();
    await server.stop();
  });

  describe('http proxy', () => {
    it('reads from an HTTP server', async () => {
      const config = /** @type ArcBaseRequest */ ({
        url: `http://${baseHttpHostname}/v1/get?a=b`,
        method: 'GET',
        headers: 'x-custom: true',
      });
      const request = new ElectronRequest(config, id, httpOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(config, 'has the ARC response');
      const { response } = info;
      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');
      assert.isNotEmpty(response.headers, 'has the response headers');
      assert.ok(response.payload, 'has the payload');
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);

      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers.host, `${baseHttpHostname}`, 'sets the destination host header');
      assert.deepEqual(body.query, { a: 'b' }, 'passes the query parameters');
      assert.equal(body.method, 'GET', 'passes the method');
      assert.equal(body.protocol, 'http', 'uses the http protocol');

      assert.isAtLeast(response.loadingTime, body.delay, 'has the loading time');
      assert.strictEqual(response.timings.blocked, 0, 'has the timings.blocked');
      assert.isAtLeast(response.timings.connect, 0, 'has the timings.connect');
      assert.isAtLeast(response.timings.receive, 0, 'has the timings.receive');
      assert.isAtLeast(response.timings.send, 0, 'has the timings.send');
      assert.isAtLeast(response.loadingTime, response.timings.wait, 'has the timings.wait');
      assert.strictEqual(response.timings.dns, -1, 'has the timings.dns');
      assert.strictEqual(response.timings.ssl, -1, 'has the timings.ssl');
    });

    it('posts to an HTTP server', async () => {
      const payload = JSON.stringify({ test: true });
      const config = /** @type ArcBaseRequest */ ({
        url: `http://${baseHttpHostname}/v1/get?x=y`,
        method: 'POST',
        headers: `content-type: application/json\nx-custom: true`,
        payload,
      });
      const request = new ElectronRequest(config, id, httpOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(config, 'has the ARC response');
      const { response } = info;
      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');
      assert.isNotEmpty(response.headers, 'has the response headers');
      assert.ok(response.payload, 'has the payload');
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);
      
      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers['content-type'], 'application/json', 'passes the content type');
      assert.equal(body.headers.host, `${baseHttpHostname}`, 'sets the destination host header');
      assert.deepEqual(body.query, { x: 'y' }, 'passes the query parameters');
      assert.equal(body.method, 'POST', 'passes the method');
      assert.equal(body.protocol, 'http', 'uses the http protocol');
      assert.equal(body.body, payload, 'passes the body');

      assert.isAtLeast(response.loadingTime, body.delay, 'has the loading time');
      assert.strictEqual(response.timings.blocked, 0, 'has the timings.blocked');
      assert.isAtLeast(response.timings.connect, 0, 'has the timings.connect');
      assert.isAtLeast(response.timings.receive, 0, 'has the timings.receive');
      assert.isAtLeast(response.timings.send, 0, 'has the timings.send');
      assert.isAtLeast(response.loadingTime, response.timings.wait, 'has the timings.wait');
      assert.typeOf(response.timings.dns, 'number', 'has the timings.dns');
      assert.strictEqual(response.timings.ssl, -1, 'has the timings.ssl');
    });

    it('reads from an HTTPS server', async () => {
      const config = /** @type ArcBaseRequest */ ({
        url: `https://${baseHttpsHostname}/v1/get?o=p`,
        method: 'GET',
        headers: `x-custom: true`,
      });
      const request = new ElectronRequest(config, id, httpOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(config, 'has the ARC response');
      const { response } = info;

      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');
      assert.isNotEmpty(response.headers, 'has the response headers');
      assert.ok(response.payload, 'has the payload');
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);
      
      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers.host, `${baseHttpsHostname}`, 'sets the destination host header');
      assert.deepEqual(body.query, { o: 'p' }, 'passes the query parameters');
      assert.equal(body.method, 'GET', 'passes the method');
      assert.equal(body.protocol, 'https', 'uses the http protocol');
      assert.isAtLeast(response.loadingTime, body.delay, 'has the loading time');

      assert.strictEqual(response.timings.blocked, 0, 'has the timings.blocked');
      assert.isAtLeast(response.timings.connect, 0, 'has the timings.connect');
      assert.isAtLeast(response.timings.receive, 0, 'has the timings.receive');
      assert.isAtLeast(response.timings.send, 0, 'has the timings.send');
      assert.isAtLeast(response.loadingTime, response.timings.wait, 'has the timings.wait');
      assert.typeOf(response.timings.dns, 'number', 'has the timings.dns');
      assert.isAtLeast(response.timings.ssl, 0, 'has the timings.ssl');
    });

    it('posts to an HTTPS server', async () => {
      const payload = JSON.stringify({ test: true });
      const config = /** @type ArcBaseRequest */ ({
        url: `https://${baseHttpsHostname}/v1/get?o=p`,
        method: 'POST',
        headers: `content-type: application/json\nx-custom: true`,
        payload,
      });
      const request = new ElectronRequest(config, id, httpOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(config, 'has the ARC response');
      const { response } = info;
      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');
      assert.isNotEmpty(response.headers, 'has the response headers');
      assert.ok(response.payload, 'has the payload');
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);
      
      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers['content-type'], 'application/json', 'passes the content type');
      assert.equal(body.headers.host, `${baseHttpsHostname}`, 'sets the destination host header');
      assert.deepEqual(body.query, { o: 'p' }, 'passes the query parameters');
      assert.equal(body.method, 'POST', 'passes the method');
      assert.equal(body.protocol, 'https', 'uses the http protocol');
      assert.isAtLeast(response.loadingTime, body.delay, 'has the loading time');
      assert.equal(body.body, payload, 'passes the body');

      assert.strictEqual(response.timings.blocked, 0, 'has the timings.blocked');
      assert.typeOf(response.timings.connect, 'number', 'has the timings.connect');
      assert.isAtLeast(response.timings.receive, 0, 'has the timings.receive');
      assert.isAtLeast(response.timings.send, 0, 'has the timings.send');
      assert.isAtLeast(response.loadingTime, response.timings.wait, 'has the timings.wait');
      assert.typeOf(response.timings.dns, 'number', 'has the timings.dns');
      assert.isAtLeast(response.timings.ssl, 0, 'has the timings.ssl');
    });
  });

  describe('https proxy', () => {
    it('reads from an HTTP server', async () => {
      const config = /** @type ArcBaseRequest */ ({
        url: `http://${baseHttpHostname}/v1/get?a=b`,
        method: 'GET',
        headers: 'x-custom: true',
      });
      const request = new ElectronRequest(config, id, httpsOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(config, 'has the ARC response');
      const { response } = info;

      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');
      assert.isNotEmpty(response.headers, 'has the response headers');
      assert.ok(response.payload, 'has the payload');
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);

      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers.host, `${baseHttpHostname}`, 'sets the destination host header');
      assert.deepEqual(body.query, { a: 'b' }, 'passes the query parameters');
      assert.equal(body.method, 'GET', 'passes the method');
      assert.equal(body.protocol, 'http', 'uses the http protocol');

      assert.isAtLeast(response.loadingTime, body.delay, 'has the loading time');
      assert.strictEqual(response.timings.blocked, 0, 'has the timings.blocked');
      assert.isAtLeast(response.timings.connect, 0, 'has the timings.connect');
      assert.isAtLeast(response.timings.receive, 0, 'has the timings.receive');
      assert.isAtLeast(response.timings.send, 0, 'has the timings.send');
      assert.isAtLeast(response.loadingTime, response.timings.wait, 'has the timings.wait');
      assert.strictEqual(response.timings.dns, -1, 'has the timings.dns');
      assert.isAtLeast(response.timings.ssl, 0, 'has the timings.ssl');
    });

    it('posts to an HTTP server', async () => {
      const payload = JSON.stringify({ test: true });
      const config = /** @type ArcBaseRequest */ ({
        url: `http://${baseHttpHostname}/v1/get?x=y`,
        method: 'POST',
        headers: `content-type: application/json\nx-custom: true`,
        payload,
      });
      const request = new ElectronRequest(config, id, httpsOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(config, 'has the ARC response');
      const { response } = info;
      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');
      assert.isNotEmpty(response.headers, 'has the response headers');
      assert.ok(response.payload, 'has the payload');
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);
      
      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers['content-type'], 'application/json', 'passes the content type');
      assert.equal(body.headers.host, `${baseHttpHostname}`, 'sets the destination host header');
      assert.deepEqual(body.query, { x: 'y' }, 'passes the query parameters');
      assert.equal(body.method, 'POST', 'passes the method');
      assert.equal(body.protocol, 'http', 'uses the http protocol');
      assert.equal(body.body, payload, 'passes the body');

      assert.isAtLeast(response.loadingTime, body.delay, 'has the loading time');
      assert.strictEqual(response.timings.blocked, 0, 'has the timings.blocked');
      assert.isAtLeast(response.timings.connect, 0, 'has the timings.connect');
      assert.isAtLeast(response.timings.receive, 0, 'has the timings.receive');
      assert.isAtLeast(response.timings.send, 0, 'has the timings.send');
      assert.isAtLeast(response.loadingTime, response.timings.wait, 'has the timings.wait');
      assert.typeOf(response.timings.dns, 'number', 'has the timings.dns');
      assert.isAtLeast(response.timings.ssl, 0, 'has the timings.ssl');
    });

    it('reads from an HTTPS server', async () => {
      const config = /** @type ArcBaseRequest */ ({
        url: `https://${baseHttpsHostname}/v1/get?o=p`,
        method: 'GET',
        headers: 'x-custom: true',
      });
      const request = new ElectronRequest(config, id, httpsOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(config, 'has the ARC response');
      const { response } = info;

      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');
      assert.isNotEmpty(response.headers, 'has the response headers');
      assert.ok(response.payload, 'has the payload');
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);

      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers.host, `${baseHttpsHostname}`, 'sets the destination host header');
      assert.deepEqual(body.query, { o: 'p' }, 'passes the query parameters');
      assert.equal(body.method, 'GET', 'passes the method');
      assert.equal(body.protocol, 'https', 'uses the http protocol');
      assert.isAtLeast(response.loadingTime, body.delay, 'has the loading time');

      assert.strictEqual(response.timings.blocked, 0, 'has the timings.blocked');
      assert.isAtLeast(response.timings.connect, 0, 'has the timings.connect');
      assert.isAtLeast(response.timings.receive, 0, 'has the timings.receive');
      assert.isAtLeast(response.timings.send, 0, 'has the timings.send');
      assert.isAtLeast(response.loadingTime, response.timings.wait, 'has the timings.wait');
      assert.typeOf(response.timings.dns, 'number', 'has the timings.dns');
      assert.isAtLeast(response.timings.ssl, 0, 'has the timings.ssl');
    });

    it('posts to an HTTPS server', async () => {
      const payload = JSON.stringify({ test: true });
      const config = /** @type ArcBaseRequest */ ({
        url: `https://${baseHttpsHostname}/v1/get?o=p`,
        method: 'POST',
        headers: `content-type: application/json\nx-custom: true`,
        payload,
      });
      const request = new ElectronRequest(config, id, httpsOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(config, 'has the ARC response');
      const { response } = info;
      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');
      assert.isNotEmpty(response.headers, 'has the response headers');
      assert.ok(response.payload, 'has the payload');
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);
      
      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers['content-type'], 'application/json', 'passes the content type');
      assert.equal(body.headers.host, `${baseHttpsHostname}`, 'sets the destination host header');
      assert.deepEqual(body.query, { o: 'p' }, 'passes the query parameters');
      assert.equal(body.method, 'POST', 'passes the method');
      assert.equal(body.protocol, 'https', 'uses the http protocol');
      assert.isAtLeast(response.loadingTime, body.delay, 'has the loading time');
      assert.equal(body.body, payload, 'passes the body');

      assert.strictEqual(response.timings.blocked, 0, 'has the timings.blocked');
      assert.typeOf(response.timings.connect, 'number', 'has the timings.connect');
      assert.isAtLeast(response.timings.receive, 0, 'has the timings.receive');
      assert.isAtLeast(response.timings.send, 0, 'has the timings.send');
      assert.isAtLeast(response.loadingTime, response.timings.wait, 'has the timings.wait');
      assert.typeOf(response.timings.dns, 'number', 'has the timings.dns');
      assert.isAtLeast(response.timings.ssl, 0, 'has the timings.ssl');
    });
  });
});
