const assert = require('chai').assert;
const url = require('url');
const { ElectronRequest } = require('../../');

describe('Electron request basics', function() {
  this.timeout(10000);
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
  }];

  const opts = [{
    timeout: 9500,
    followRedirects: false,
    hosts: [{
      from: 'domain.com',
      to: 'test.com',
    }],
  }];

  describe('_connect()', function() {
    let request;
    before(function() {
      request = new ElectronRequest(requests[0], opts[0]);
    });

    it('Returns request object', function(done) {
      const result = request._connect();
      assert.typeOf(result, 'object');
      result.once('close', () => done());
      result.once('error', () => done());
    });

    it('Sets startTime', function(done) {
      const result = request._connect();
      assert.typeOf(request.stats.startTime, 'number');
      result.once('close', () => done());
      result.once('error', () => done());
    });

    it('Sets messageStart', function(done) {
      const result = request._connect();
      assert.typeOf(request.stats.messageStart, 'number');
      result.once('close', () => done());
      result.once('error', () => done());
    });
  });

  describe('_connectSsl()', function() {
    let request;
    beforeEach(function() {
      request = new ElectronRequest(requests[2], opts[0]);
    });

    it('Returns an object', function(done) {
      const result = request._connectSsl(undefined, request.uri);
      assert.typeOf(result, 'object');
      request.once('load', () => done());
      request.once('error', () => done());
    });

    it('Sets startTime', function(done) {
      request._connectSsl(undefined, request.uri);
      assert.typeOf(request.stats.startTime, 'number');
      request.once('load', () => done());
      request.once('error', () => done());
    });

    it('Sets messageStart', function(done) {
      request._connectSsl(undefined, request.uri);
      assert.typeOf(request.stats.messageStart, 'number');
      request.once('load', () => done());
      request.once('error', () => done());
    });
  });

  describe('_connectHttp()', function() {
    let request;
    before(function() {
      request = new ElectronRequest(requests[0], opts[0]);
    });

    it('Returns an object', function(done) {
      const result = request._connectHttp(undefined, request.uri);
      assert.typeOf(result, 'object');
      result.once('close', () => done());
      result.once('error', () => done());
    });

    it('Sets startTime', function(done) {
      const result = request._connectHttp(undefined, request.uri);
      assert.typeOf(request.stats.startTime, 'number');
      result.once('close', () => done());
      result.once('error', () => done());
    });

    it('Sets messageStart', function(done) {
      const result = request._connectHttp(undefined, request.uri);
      assert.typeOf(request.stats.messageStart, 'number');
      result.once('close', () => done());
      result.once('error', () => done());
    });
  });

  describe('_prepareMessage()', function() {
    it('Returns promise resolved to a Buffer', function() {
      const request = new ElectronRequest(requests[1], opts[0]);
      return request._prepareMessage()
          .then((result) => assert.isTrue(result instanceof Uint8Array));
    });

    it('Ignores payload for GET requests', function() {
      const request = new ElectronRequest(requests[0], opts[0]);
      return request._prepareMessage()
          .then((result) => {
            assert.isUndefined(result);
          });
    });

    it('Adds content length header', () => {
      const request = new ElectronRequest(requests[1], opts[0]);
      return request._prepareMessage()
          .then(() => {
            const search = request.arcRequest.headers.indexOf('content-length: 9');
            assert.isAbove(search, 0);
          });
    });

    it('Adds default headers', async () => {
      const request = new ElectronRequest(requests[1], {
        defaultHeaders: true
      });
      await request._prepareMessage();
      assert.include(request.arcRequest.headers, 'user-agent: advanced-rest-client', 'user-agent is set');
      assert.include(request.arcRequest.headers, 'accept: */*', 'accept is set');
    });
  });

  describe('_createGenericOptions()', () => {
    let request;
    before(function() {
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

    it('Sets slashes', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.isTrue(result.slashes);
    });

    it('Sets host', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.equal(result.host, 'api.com:5123');
    });

    it('Sets port', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.equal(result.port, '5123');
    });

    it('Sets hostname', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.equal(result.hostname, 'api.com');
    });

    it('Sets hash', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.equal(result.hash, '#test');
    });

    it('Sets search', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.equal(result.search, '?qp1=v1&qp2=v2');
    });

    it('Sets pathname', () => {
      const uri = url.parse(requests[3].url);
      const result = request._createGenericOptions(uri);
      assert.equal(result.pathname, '/path');
    });

    it('Sets path', () => {
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
    before(function() {
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
    before(function() {
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

  describe('Events', function() {
    let request;

    it('Dispatches "loadstart" event', function(done) {
      request = new ElectronRequest(requests[0], opts[0]);
      let called = false;
      request.once('load', function() {
        assert.isTrue(called);
        done();
      });
      request.once('loadstart', function(id) {
        assert.equal(id, requests[0].id);
        called = true;
      });
      request.once('error', function(error) {
        done(error);
      });
      request.send();
    });

    it('Dispatches "firstbyte" event', function(done) {
      request = new ElectronRequest(requests[0], opts[0]);
      let called = false;
      request.once('load', function() {
        assert.isTrue(called);
        done();
      });
      request.once('firstbyte', function(id) {
        assert.equal(id, requests[0].id);
        called = true;
      });
      request.once('error', function(error) {
        done(error);
      });
      request.send();
    });

    it('Dispatches "loadend" event', function(done) {
      request = new ElectronRequest(requests[0], opts[0]);
      let called = false;
      request.once('load', function() {
        assert.isTrue(called);
        done();
      });
      request.once('loadend', function(id) {
        assert.equal(id, requests[0].id);
        called = true;
      });
      request.once('error', function(error) {
        done(error);
      });
      request.send();
    });

    it('Dispatches "headersreceived" event', function(done) {
      request = new ElectronRequest(requests[0], opts[0]);
      let called = false;
      request.once('load', function() {
        assert.isTrue(called);
        done();
      });
      request.once('headersreceived', function(id) {
        assert.equal(id, requests[0].id);
        called = true;
      });
      request.once('error', function(error) {
        done(error);
      });
      request.send();
    });
  });
});
