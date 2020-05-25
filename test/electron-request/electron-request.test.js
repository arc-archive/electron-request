const { assert } = require('chai');
const url = require('url');
const { ElectronRequest } = require('../../');
const { untilBody } = require('../Utils.js');

describe('Electron request basics', () => {
  const requests = [{
    id: 'r-1',
    url: 'http://localhost/get',
    method: 'GET',
    headers: 'Host: test.com\nContent-Length: 0',
    payload: 'abc',
  }, {
    id: 'r-2',
    url: 'http://localhost/post',
    method: 'POST',
    headers: 'content-type: text/plain',
    payload: Buffer.from([0x74, 0x65, 0x73, 0x74, 0x0a, 0x74, 0x65, 0x73, 0x74]),
  }, {
    id: 'r-3',
    url: 'https://google.com',
    method: 'GET',
    headers: 'Host: localhost\nContent-Length: 0',
    payload: 'abc',
  }, {
    id: 'r-4',
    url: 'https://api.com:5123/path?qp1=v1&qp2=v2#test',
    method: 'POST',
    headers: 'Host: localhost\nContent-Length: 3\nx-test: true',
    payload: 'abc',
  }, {
    id: 'r-5',
    url: 'http://localhost/get?a=b&c=d',
    method: 'GET',
    headers: 'x-test: true\naccept: application/json',
  }];

  const opts = [{
    timeout: 9500,
    followRedirects: false,
    hosts: [{
      from: 'domain.com',
      to: 'test.com',
    }],
  }];

  describe('_connect()', () => {
    let request;
    before(() => {
      request = new ElectronRequest(requests[0], opts[0]);
    });

    it('Returns request object', (done) => {
      const result = request._connect();
      assert.typeOf(result, 'object');
      result.once('close', () => done());
      result.once('error', () => done());
    });

    it('Sets startTime', (done) => {
      const result = request._connect();
      assert.typeOf(request.stats.startTime, 'number');
      result.once('close', () => done());
      result.once('error', () => done());
    });

    it('Sets messageStart', (done) => {
      const result = request._connect();
      assert.typeOf(request.stats.messageStart, 'number');
      result.once('close', () => done());
      result.once('error', () => done());
    });
  });

  describe('_connectSsl()', () => {
    let request;
    beforeEach(() => {
      request = new ElectronRequest(requests[2], opts[0]);
    });

    it('Returns an object', (done) => {
      const result = request._connectSsl(undefined, request.uri);
      assert.typeOf(result, 'object');
      request.once('load', () => done());
      request.once('error', () => done());
    });

    it('Sets startTime', (done) => {
      request._connectSsl(undefined, request.uri);
      assert.typeOf(request.stats.startTime, 'number');
      request.once('load', () => done());
      request.once('error', () => done());
    });

    it('Sets messageStart', (done) => {
      request._connectSsl(undefined, request.uri);
      assert.typeOf(request.stats.messageStart, 'number');
      request.once('load', () => done());
      request.once('error', () => done());
    });
  });

  describe('_connectHttp()', () => {
    let request;
    before(() => {
      request = new ElectronRequest(requests[0], opts[0]);
    });

    it('Returns an object', (done) => {
      const result = request._connectHttp(undefined, request.uri);
      assert.typeOf(result, 'object');
      result.once('close', () => done());
      result.once('error', () => done());
    });

    it('Sets startTime', (done) => {
      const result = request._connectHttp(undefined, request.uri);
      assert.typeOf(request.stats.startTime, 'number');
      result.once('close', () => done());
      result.once('error', () => done());
    });

    it('Sets messageStart', (done) => {
      const result = request._connectHttp(undefined, request.uri);
      assert.typeOf(request.stats.messageStart, 'number');
      result.once('close', () => done());
      result.once('error', () => done());
    });
  });

  describe('_prepareMessage()', () => {
    it('Returns promise resolved to a Buffer', async () => {
      const request = new ElectronRequest(requests[1], opts[0]);
      const result = await request._prepareMessage();
      assert.isTrue(result instanceof Uint8Array);
    });

    it('Ignores payload for GET requests', async () => {
      const request = new ElectronRequest(requests[0], opts[0]);
      const result = await request._prepareMessage();
      assert.isUndefined(result);
    });

    it('Adds content length header', async () => {
      const request = new ElectronRequest(requests[1], opts[0]);
      await request._prepareMessage();
      const search = request.arcRequest.headers.indexOf('content-length: 9');
      assert.isAbove(search, 0);
    });

    it('Adds default headers', async () => {
      const request = new ElectronRequest(requests[1], {
        defaultHeaders: true,
      });
      await request._prepareMessage();
      assert.include(request.arcRequest.headers, 'user-agent: advanced-rest-client', 'user-agent is set');
      assert.include(request.arcRequest.headers, 'accept: */*', 'accept is set');
    });
  });

  describe('_createGenericOptions()', () => {
    let request;
    before(() => {
      request = new ElectronRequest(requests[3], opts[0]);
    });

    it('Returns an object', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.typeOf(result, 'object');
    });

    it('Sets protocol', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.equal(result.protocol, 'https:');
    });

    it('Sets host', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.equal(result.host, 'api.com');
    });

    it('Sets port', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.equal(result.port, '5123');
    });

    it('Sets hash', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.equal(result.hash, '#test');
    });

    it('Sets search parameters with path', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.equal(result.path, '/path?qp1=v1&qp2=v2');
    });

    it('Sets href', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.equal(result.href, 'https://api.com:5123/path?qp1=v1&qp2=v2#test');
    });

    it('Sets method', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.equal(result.method, 'POST');
    });

    it('Sets headers', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.typeOf(result.headers, 'object');
    });

    it('Sets header #1', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.equal(result.headers.Host, 'localhost');
    });

    it('Sets header #2', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.equal(result.headers['Content-Length'], '3');
    });

    it('Sets header #3', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.equal(result.headers['x-test'], 'true');
    });
  });

  describe('_addSslOptions()', () => {
    let request;
    let options;
    before(() => {
      request = new ElectronRequest(requests[3], opts[0]);
      options = {};
    });

    it('Sets HTTP agent', () => {
      request._addSslOptions(options);
      assert.typeOf(options.agent, 'object');
    });

    it('Adds SSL certificate ignore options', () => {
      request.opts.validateCertificates = true;
      request._addSslOptions(options);
      assert.typeOf(options.checkServerIdentity, 'function');
    });

    it('Adds SSL certificate validation options', () => {
      request.opts.validateCertificates = false;
      request._addSslOptions(options);
      assert.isFalse(options.rejectUnauthorized);
      assert.isFalse(options.requestOCSP);
    });
  });

  describe('Starts handlers', () => {
    let request;
    before(() => {
      request = new ElectronRequest(requests[3], opts[0]);
    });

    it('Sets lookupTime', () => {
      request._lookupHandler();
      assert.typeOf(request.stats.lookupTime, 'number');
    });

    it('Sets secureConnectedTime', () => {
      request._secureConnectHandler();
      assert.typeOf(request.stats.secureConnectedTime, 'number');
    });

    it('Sets secureConnectedTime', () => {
      request._connectHandler();
      assert.typeOf(request.stats.connectedTime, 'number');
    });

    it('Sets secureStartTime', () => {
      request._connectHandler();
      assert.typeOf(request.stats.secureStartTime, 'number');
    });

    it('Sets sentTime', () => {
      request._sendEndHandler();
      assert.typeOf(request.stats.sentTime, 'number');
    });

    it('Sets sentTime only once', (done) => {
      request._sendEndHandler();
      const t1 = request.stats.sentTime;
      setTimeout(() => {
        request._sendEndHandler();
        const t2 = request.stats.sentTime;
        assert.equal(t1, t2);
        done();
      });
    });
  });

  describe('Events', () => {
    let request;

    it('Dispatches "loadstart" event', (done) => {
      request = new ElectronRequest(requests[0], opts[0]);
      let called = false;
      request.once('load', () => {
        assert.isTrue(called);
        done();
      });
      request.once('loadstart', (id) => {
        assert.equal(id, requests[0].id);
        called = true;
      });
      request.once('error', (error) => {
        done(error);
      });
      request.send().catch((e) => done(e));
    });

    it('Dispatches "firstbyte" event', (done) => {
      request = new ElectronRequest(requests[0], opts[0]);
      let called = false;
      request.once('load', () => {
        assert.isTrue(called);
        done();
      });
      request.once('firstbyte', (id) => {
        assert.equal(id, requests[0].id);
        called = true;
      });
      request.once('error', (error) => {
        done(error);
      });
      request.send().catch((e) => done(e));
    });

    it('Dispatches "loadend" event', (done) => {
      request = new ElectronRequest(requests[0], opts[0]);
      let called = false;
      request.once('load', () => {
        assert.isTrue(called);
        done();
      });
      request.once('loadend', (id) => {
        assert.equal(id, requests[0].id);
        called = true;
      });
      request.once('error', (error) => {
        done(error);
      });
      request.send().catch((e) => done(e));
    });

    it('Dispatches "headersreceived" event', (done) => {
      request = new ElectronRequest(requests[0], opts[0]);
      let called = false;
      request.once('load', () => {
        assert.isTrue(called);
        done();
      });
      request.once('headersreceived', (id) => {
        assert.equal(id, requests[0].id);
        called = true;
      });
      request.once('error', (error) => {
        done(error);
      });
      request.send().catch((e) => done(e));
    });
  });

  describe('Sending request parameters', () => {
    it('Sends query paramerters to the server', (done) => {
      const request = new ElectronRequest(requests[4], opts[0]);
      request.once('load', (id, response) => {
        assert.ok(id, 'ID is set');
        const payloadString = response.payload.toString();
        const payload = JSON.parse(payloadString);
        assert.deepEqual(payload.args, { a: 'b', c: 'd' });
        done();
      });
      request.once('error', (error) => done(error));
      request.send().catch((e) => done(e));
    });

    it('Sends headers to the server', async () => {
      const request = new ElectronRequest(requests[4], opts[0]);
      await request.send();
      const response = await untilBody(request);
      const { headers } = response;
      assert.equal(headers.Host, 'localhost');
      assert.equal(headers['X-Test'], 'true');
    });
  });
});
