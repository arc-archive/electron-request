const assert = require('chai').assert;
const {ElectronRequest} = require('../../');

describe('Electron request basics', function() {
  this.timeout(10000);
  const requests = [{
    id: 'r-1',
    url: 'http://localhost/get',
    method: 'GET',
    headers: 'Host: test.com\nContent-Length: 0',
    payload: 'abc'
  }, {
    id: 'r-2',
    url: 'http://localhost/post',
    method: 'POST',
    headers: 'content-type: text/plain',
    payload: Buffer.from([0x74, 0x65, 0x73, 0x74, 0x0a, 0x74, 0x65, 0x73, 0x74])
  }, {
    id: 'r-3',
    url: 'https://google.com',
    method: 'GET',
    headers: 'Host: localhost\nContent-Length: 0',
    payload: 'abc'
  }];

  const opts = [{
    timeout: 9500,
    followRedirects: false,
    hosts: [{
      from: 'domain.com',
      to: 'test.com'
    }]
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
