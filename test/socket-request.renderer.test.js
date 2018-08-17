const assert = require('chai').assert;
const {SocketRequest} = require('../');
const chunkedServer = require('./chunked-server');
const {ArcHeaders} = require('../lib/arc-headers');

global.performance = {
  now: function() {
    return Date.now();
  }
};

describe('Socket request basics', function() {
  this.timeout(10000);
  const httpPort = 8123;
  const sslPort = 8124;

  const requests = [{
    id: 'r-1',
    url: `http://localhost:${httpPort}/api/endpoint?query=param`,
    method: 'GET',
    headers: 'Host: test.com\nContent-Length: 0',
    payload: 'abc'
  }, {
    id: 'r-2',
    url: `http://localhost:${httpPort}/api/endpoint?query=param`,
    method: 'POST',
    headers: 'content-type: text/plain',
    payload: Buffer.from([0x74, 0x65, 0x73, 0x74, 0x0a, 0x74, 0x65, 0x73, 0x74])
  }, {
    id: 'r-3',
    url: `http://localhost:${httpPort}/api/endpoint?query=param`,
    method: 'POST',
    headers: 'Host: test.com\nContent-Length: 12',
    payload: Buffer.from([0x74, 0x65, 0x73, 0x74, 0x0a, 0x74, 0x65, 0x73, 0x74])
  }, {
    id: 'r-4',
    url: `http://localhost:${httpPort}/api/endpoint?query=param`,
    method: 'GET',
    headers: 'Host: test.com',
    payload: ''
  }, {
    id: 'r-5',
    url: `http://localhost:${httpPort}/api/endpoint?query=param`,
    method: 'GET',
    headers: 'Host: test.com',
    auth: {
      method: 'ntlm',
      domain: 'domain.com',
      username: 'test',
      password: 'test'
    }
  }];

  const opts = [{
    timeout: 50000,
    followRedirects: false,
    hosts: [{
      from: 'domain.com',
      to: 'test.com'
    }]
  }];
  before(function() {
    return chunkedServer.startServer(httpPort, sslPort);
  });

  after(function() {
    return chunkedServer.stopServer();
  });

  describe('Constructor', function() {
    let request;
    before(function() {
      request = new SocketRequest(requests[0], opts[0]);
    });

    it('arcRequest is set as a copy of the request object', function() {
      assert.ok(request.arcRequest, 'arcRequest is set');
      assert.isFalse(request.arcRequest === requests[0]);
    });

    it('Sets the aborted property', function() {
      assert.isFalse(request.aborted);
    });

    it('Sets empty stats property', function() {
      assert.typeOf(request.stats, 'object');
      assert.lengthOf(Object.keys(request.stats), 0);
    });

    it('Sets state property', function() {
      assert.equal(request.state, 0);
    });

    it('Sets timeout property', function() {
      assert.equal(request.timeout, opts[0].timeout);
    });

    it('Timeout property cannot be changed', function() {
      request.timeout = 20;
      assert.notEqual(request.timeout, 20);
    });

    it('Sets hosts property', function() {
      assert.typeOf(request.hosts, 'array');
      assert.lengthOf(request.hosts, 1);
    });

    it('Sets uri property', function() {
      assert.typeOf(request.uri, 'object');
    });

    it('Sets hostHeader property', function() {
      assert.typeOf(request.hostHeader, 'string');
    });
  });

  describe('_connect()', function() {
    let request;
    const host = 'localhost';

    before(function() {
      request = new SocketRequest(requests[0], opts[0]);
    });

    it('Returns a promise', function() {
      const result = request._connect(httpPort, host);
      assert.typeOf(result, 'promise');
      return result
      .then((client) => client.destroy());
    });

    it('Resolved promise returns HTTP server client', function() {
      return request._connect(httpPort, host)
      .then((client) => {
        assert.typeOf(client, 'object');
        client.destroy();
      });
    });

    it('Sets stats propty', function() {
      return request._connect(httpPort, host)
      .then((client) => {
        client.destroy();
        assert.typeOf(request.stats.connect, 'number', 'connect stat is set');
        assert.typeOf(request.stats.dns, 'number', 'dns stat is set');
      });
    });
  });

  describe('_connectTls()', function() {
    let request;
    const host = 'localhost';

    before(function() {
      request = new SocketRequest(requests[0], opts[0]);
    });

    it('Returns a promise', function() {
      const result = request._connectTls(sslPort, host);
      assert.typeOf(result, 'promise');
      return result
      .then((client) => client.destroy());
    });

    it('Resolved promise returns HTTP server client', function() {
      return request._connectTls(sslPort, host)
      .then((client) => {
        assert.typeOf(client, 'object');
        client.destroy();
      });
    });

    it('Sets stats propty', function() {
      return request._connectTls(sslPort, host)
      .then((client) => {
        client.destroy();
        assert.typeOf(request.stats.connect, 'number', 'connect stat is set');
        assert.typeOf(request.stats.dns, 'number', 'dns stat is set');
        assert.typeOf(request.stats.ssl, 'number', 'ssl stat is set');
      });
    });
  });

  describe('connect()', function() {
    let request;
    let createdClient;

    before(function() {
      request = new SocketRequest(requests[0], opts[0]);
    });

    afterEach(function() {
      if (createdClient) {
        createdClient.end();
        createdClient.destroy();
        createdClient = undefined;
      }
    });

    it('Returns a promise', function() {
      const result = request.connect();
      assert.typeOf(result, 'promise');
      return result.then((client) => {
        createdClient = client;
      });
    });

    it('Resolved promise returns HTTP server client', function() {
      return request.connect()
      .then((client) => {
        assert.typeOf(client, 'object');
        createdClient = client;
      });
    });

    it('Sets socket propery', function() {
      return request.connect()
      .then((client) => {
        assert.isTrue(request.socket === client);
        createdClient = client;
      });
    });

    it('Sets socket timeout', function() {
      return request.connect()
      .then((client) => {
        assert.isTrue(client._idleTimeout === opts[0].timeout);
        createdClient = client;
      });
    });
  });

  describe('_payloadMessage()', function() {
    let request;
    before(function() {
      request = new SocketRequest(requests[0], opts[0]);
    });

    it('Resolves to promise', function() {
      let result = request._payloadMessage();
      assert.typeOf(result, 'promise');
    });

    it('Returns undefined for missing argument', function() {
      return request._payloadMessage()
      .then((result) => assert.isUndefined(result));
    });

    it('Transforms string', function() {
      let compare = Buffer.from([
        0x74, 0x65, 0x73, 0x74, 0x0d, 0x0a, 0x74, 0x65, 0x73, 0x74
      ]);
      return request._payloadMessage('test\ntest')
      .then((result) => assert.isTrue(result.equals(compare)));
    });

    it('Transforms ArrayBuffer', function() {
      let compare = Buffer.from([
        0x74, 0x65, 0x73, 0x74, 0x0a, 0x74, 0x65, 0x73, 0x74
      ]);
      let payload = new Uint8Array([
        116, 101, 115, 116, 10, 116, 101, 115, 116
      ]).buffer;
      return request._payloadMessage(payload)
      .then((result) => {
        assert.isTrue(result.equals(compare));
      });
    });

    it('Returns the same Buffer', function() {
      let compare = Buffer.from([
        0x74, 0x65, 0x73, 0x74, 0x0a, 0x74, 0x65, 0x73, 0x74
      ]);
      return request._payloadMessage(compare)
      .then((result) => {
        assert.isTrue(result === compare);
      });
    });
  });

  describe('_addContentLength()', function() {
    let headers;
    beforeEach(() => {
      headers = new ArcHeaders();
    });

    it('Adds content length header', function() {
      const request = new SocketRequest(requests[1], opts[0]);
      request._addContentLength(requests[1].payload, headers);
      assert.equal(headers.get('content-length'), 9);
    });

    it('Do nothing for GET requests', function() {
      const request = new SocketRequest(requests[3], opts[0]);
      request._addContentLength(requests[2].payload);
      assert.isFalse(headers.has('content-length'));
    });
  });

  describe('_authorizeNtlm()', function() {
    let headers;
    let request;
    beforeEach(() => {
      headers = new ArcHeaders();
      request = new SocketRequest(requests[4], opts[0]);
    });

    it('Adds authorization header', function() {
      request._authorizeNtlm(requests[4].auth, headers);
      assert.isTrue(headers.has('Authorization'));
    });

    it('Authorization is NTLM', function() {
      request._authorizeNtlm(requests[4].auth, headers);
      const value = headers.get('Authorization');
      assert.equal(value.indexOf('NTLM '), 0);
    });
  });

  describe('_prepareMessage()', function() {
    let request;
    before(function() {
      request = new SocketRequest(requests[1], opts[0]);
    });

    it('Returns buffer', function() {
      const result = request._prepareMessage();
      assert.isTrue(result instanceof Buffer);
    });

    it('Contains status message', function() {
      const result = request._prepareMessage().toString();
      assert.equal(result.split('\n')[0],
        'POST /api/endpoint?query=param HTTP/1.1\r');
    });

    it('Adds Host header', function() {
      const result = request._prepareMessage().toString();
      assert.equal(result.split('\n')[1], 'Host: localhost:8123\r');
    });

    it('Adds rest of the headers', function() {
      const result = request._prepareMessage().toString();
      assert.equal(result.split('\n')[2], 'content-type: text/plain\r');
    });

    it('Adds empty line after headers', function() {
      const result = request._prepareMessage().toString();
      assert.equal(result.split('\n')[3], '\r');
    });

    it('Adds payload message', function() {
      const result = request._prepareMessage(requests[1].payload).toString();
      assert.equal(result.split('\n')[4], 'test');
      assert.equal(result.split('\n')[5], 'test');
    });
  });

  describe('prepareMessage()', function() {
    it('Returns promise resolved to a Buffer', function() {
      const request = new SocketRequest(requests[0], opts[0]);
      return request.prepareMessage()
      .then((result) => assert.isTrue(result instanceof Buffer));
    });

    it('Ignores payload for GET requests', function() {
      const request = new SocketRequest(requests[0], opts[0]);
      return request.prepareMessage()
      .then((result) => {
        assert.lengthOf(result.toString().split('\n'), 5);
      });
    });

    it('Creates message with payload', function() {
      const request = new SocketRequest(requests[1], opts[0]);
      return request.prepareMessage()
      .then((result) => {
        assert.lengthOf(result.toString().split('\n'), 7);
      });
    });

    it('Adds NTLM request headers from payload processing', () => {
      const request = new SocketRequest(requests[4], opts[0]);
      return request.prepareMessage()
      .then((result) => {
        assert.equal(request.arcRequest.headers.indexOf('NTLM '), -1,
          'Headers are not altered');
        assert.isAbove(result.toString().indexOf('NTLM '), 0,
        'Adds headers to body');
      });
    });

    it('Adds content length header', () => {
      const request = new SocketRequest(requests[1], opts[0]);
      return request.prepareMessage()
      .then((result) => {
        const search = request.arcRequest.headers.indexOf('content-length: 9');
        assert.isAbove(search, 0);
        assert.isAbove(result.toString().indexOf('content-length: 9'), 0);
      });
    });
  });

  describe('writeMessage()', function() {
    let message;
    let request;
    let createdClient;

    this.timeout(20000);

    before(function() {
      let str = 'GET /api/endpoint?query=param HTTP/1.1\r\n';
      str += 'Host: localhost:8123\r\n';
      str += '\r\n';
      message = Buffer.from(str);
    });

    beforeEach(function() {
      request = new SocketRequest(requests[0], opts[0]);
      return request.connect()
      .then((client) => {
        createdClient = client;
      });
    });

    afterEach(function() {
      if (createdClient) {
        createdClient.end();
        createdClient.destroy();
        createdClient = undefined;
      }
    });

    it('Returns promise', function() {
      let result = request.writeMessage(message);
      assert.typeOf(result, 'promise', 'Returns a promise object');
      return result.then((data) => assert.isUndefined(data,
        'Promise resolves nothing'));
    });

    it('Sets messageSent property on arcRequest', function() {
      return request.writeMessage(message)
      .then(() => {
        assert.typeOf(request.arcRequest.sentHttpMessage, 'string');
      });
    });

    it('Sets messageSendStart property on stats object', function() {
      return request.writeMessage(message)
      .then(() => {
        assert.typeOf(request.stats.messageSendStart, 'number');
      });
    });

    it('Sets waitingStart property on stats object', function() {
      return request.writeMessage(message)
      .then(() => {
        assert.typeOf(request.stats.waitingStart, 'number');
      });
    });

    it('Sets send property on stats object', function() {
      return request.writeMessage(message)
      .then(() => {
        assert.typeOf(request.stats.send, 'number');
      });
    });

    it('Emits loadstart event', function(done) {
      request.once('loadstart', function(id) {
        assert.equal(id, requests[0].id);
        done();
      });
      request.writeMessage(message);
    });
  });

  describe('headersToObject()', function() {
    let request;
    before(function() {
      request = new SocketRequest(requests[1], opts[0]);
    });

    it('Result with empty object when no argument', function() {
      const result = request.headersToObject();
      assert.typeOf(result, 'object');
      assert.lengthOf(Object.keys(result), 0);
    });

    it('Result with empty object when empty string', function() {
      const result = request.headersToObject('');
      assert.lengthOf(Object.keys(result), 0);
    });

    it('Result with empty object when argument is not string', function() {
      const result = request.headersToObject(2);
      assert.lengthOf(Object.keys(result), 0);
    });

    it('Parses header string', function() {
      let headers = 'Content-Type: test/plain\n';
      headers += 'x-header: x-value';
      const result = request.headersToObject(headers);
      const keys = Object.keys(result);
      assert.lengthOf(keys, 2);
      assert.equal(result['x-header'], 'x-value');
      assert.equal(result['Content-Type'], 'test/plain');
    });

    it('Ignores empty lines', function() {
      let headers = 'Content-Type: test/plain\n';
      headers += '\n';
      headers += 'x-header: x-value';
      const result = request.headersToObject(headers);
      const keys = Object.keys(result);
      assert.lengthOf(keys, 2);
      assert.equal(result['x-header'], 'x-value');
      assert.equal(result['Content-Type'], 'test/plain');
    });

    it('Accepts empty values', function() {
      let headers = 'Content-Type: \n';
      headers += 'x-header: x-value';
      const result = request.headersToObject(headers);
      const keys = Object.keys(result);
      assert.lengthOf(keys, 2);
      assert.equal(result['x-header'], 'x-value');
      assert.equal(result['Content-Type'], '');
    });
  });

  describe('_parseHeaders()', function() {
    let request;
    let headersStr;
    let headersBuf;
    before(function() {
      request = new SocketRequest(requests[1], opts[0]);
      request._response = {};
      headersStr = 'Content-Type: application/test\r\n';
      headersStr += 'Content-Length: 123\r\n';
      headersStr += 'Transfer-Encoding: chunked\r\n';
      headersBuf = Buffer.from(headersStr);
    });

    it('Sets headers property', function() {
      request._parseHeaders(headersBuf);
      assert.typeOf(request._response.headers, 'string');
    });

    it('Headers contains 3 headers', function() {
      request._parseHeaders(headersBuf);
      let list = {};
      request._response._headers.forEach((value, name) => {
        list[name] = value;
      });
      assert.lengthOf(Object.keys(list), 3);
    });

    it('Sets _contentLength property', function() {
      request._parseHeaders(headersBuf);
      assert.equal(request._contentLength, 123);
    });

    it('Sets _chunked property', function() {
      request._parseHeaders(headersBuf);
      assert.isTrue(request._chunked);
    });

    it('Dispatches headersreceived event', function(done) {
      request.once('headersreceived', function(id) {
        assert.equal(id, requests[1].id);
        done();
      });
      request._parseHeaders(headersBuf);
    });

    it('The headersreceived event contains returnValue', function(done) {
      request.once('headersreceived', function(id, detail) {
        assert.isTrue(detail.returnValue);
        done();
      });
      request._parseHeaders(headersBuf);
    });

    it('The headersreceived event contains value property', function(done) {
      request.once('headersreceived', function(id, detail) {
        assert.ok(detail.value);
        done();
      });
      request._parseHeaders(headersBuf);
    });

    it('Aborts the request when the event is canceled', function() {
      request.once('headersreceived', function(id, detail) {
        detail.returnValue = false;
      });
      request._parseHeaders(headersBuf);
      assert.isTrue(request.aborted);
    });
  });

  describe('Events', function() {
    let request;
    beforeEach(function() {
      request = new SocketRequest(requests[1], opts[0]);
    });

    it('Dispatches "loadstart" event', function(done) {
      request = new SocketRequest(requests[0], opts[0]);
      let called = false;
      request.once('load', function() {
        assert.isTrue(called);
        done();
      });
      request.once('loadstart', function(id) {
        assert.equal(id, requests[0].id);
        called = true;
      });
      request.once('error', function(id, error) {
        done(error);
      });
      request.send();
    });

    it('Dispatches "firstbyte" event', function(done) {
      request = new SocketRequest(requests[0], opts[0]);
      let called = false;
      request.once('load', function() {
        assert.isTrue(called);
        done();
      });
      request.once('firstbyte', function(id) {
        assert.equal(id, requests[0].id);
        called = true;
      });
      request.once('error', function(id, error) {
        done(error);
      });
      request.send();
    });

    it('Dispatches "loadend" event', function(done) {
      request = new SocketRequest(requests[0], opts[0]);
      let called = false;
      request.once('load', function() {
        assert.isTrue(called);
        done();
      });
      request.once('loadend', function(id) {
        assert.equal(id, requests[0].id);
        called = true;
      });
      request.once('error', function(id, error) {
        done(error);
      });
      request.send();
    });

    it('Dispatches "headersreceived" event', function(done) {
      request = new SocketRequest(requests[0], opts[0]);
      let called = false;
      request.once('load', function() {
        assert.isTrue(called);
        done();
      });
      request.once('headersreceived', function(id) {
        assert.equal(id, requests[0].id);
        called = true;
      });
      request.once('error', function(id, error) {
        done(error);
      });
      request.send();
    });
  });
});