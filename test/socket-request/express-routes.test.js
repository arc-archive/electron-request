const { assert } = require('chai');
const { logger } = require('../dummy-logger.js');
const { SocketRequest } = require('../../');
const { startServer, stopServer } = require('../express-api.js');

// @ts-ignore
global.performance = {
  now: () => Date.now(),
};

describe('ExpressJS requests', () => {
  const httpPort = 8125;

  before(async () => startServer(httpPort));

  after(async () => stopServer());

  /**
   * @param {SocketRequest} request
   * @return {Promise}
   */
  async function untilResponse(request) {
    return new Promise((resolve, reject) => {
      request.on('error', (error) => {
        reject(error);
      });
      request.on('load', (id, response, request) => {
        resolve({
          id,
          response,
          request,
        });
      });
    });
  }

  describe('POST requests', () => {
    const requestData = {
      id: 'r-1',
      url: `http://localhost:${httpPort}/v1/tests/`,
      method: 'POST',
      headers: 'Host: test.com\nContent-Length: 0',
      payload: 'abc',
    };
    const opts = {
      timeout: 50000,
      followRedirects: false,
      hosts: [],
      logger,
    };

    it('makes a POST request', async () => {
      const request = new SocketRequest(requestData, opts);
      await request.send();
      const { id } = await untilResponse(request);
      assert.equal(id, requestData.id);
    });

    it('response has stats', async () => {
      const request = new SocketRequest(requestData, opts);
      await request.send();
      const { response } = await untilResponse(request);
      assert.equal(response.status, 200);
    });

    it('response has statusText', async () => {
      const request = new SocketRequest(requestData, opts);
      await request.send();
      const { response } = await untilResponse(request);
      assert.equal(response.statusText, 'OK');
    });

    it('response has headers', async () => {
      const request = new SocketRequest(requestData, opts);
      await request.send();
      const { response } = await untilResponse(request);
      assert.typeOf(response.headers, 'string');
    });

    it('response has url', async () => {
      const request = new SocketRequest(requestData, opts);
      await request.send();
      const { response } = await untilResponse(request);
      assert.equal(response.url, 'http://localhost:8125/v1/tests/');
    });

    it('has response payload', async () => {
      const request = new SocketRequest(requestData, opts);
      await request.send();
      const { response } = await untilResponse(request);
      assert.ok(response.payload);
    });

    it('has response stats', async () => {
      const request = new SocketRequest(requestData, opts);
      await request.send();
      const { response } = await untilResponse(request);
      assert.typeOf(response.stats, 'object');
    });

    it('has response sentHttpMessage', async () => {
      const request = new SocketRequest(requestData, opts);
      await request.send();
      const { response } = await untilResponse(request);
      assert.typeOf(response.sentHttpMessage, 'string');
    });
  });

  describe('GET requests', () => {
    const requestData = {
      id: 'r-1',
      url: `http://localhost:${httpPort}/v1/tests/`,
      method: 'GET',
      headers: 'Host: test.com',
    };
    const opts = {
      timeout: 50000,
      followRedirects: false,
      hosts: [],
      logger,
    };

    it('makes a GET request', async () => {
      const request = new SocketRequest(requestData, opts);
      await request.send();
      const { id } = await untilResponse(request);
      assert.equal(id, requestData.id);
    });

    it('makes a delayed GET request', async () => {
      const r = { ...requestData };
      r.url += '?delay=300';
      const request = new SocketRequest(r, opts);
      await request.send();
      const { id } = await untilResponse(request);
      assert.equal(id, requestData.id);
    });
  });
});
