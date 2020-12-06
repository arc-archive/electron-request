const assert = require('chai').assert;
const { ElectronRequest } = require('../../');

/** @typedef {import('@advanced-rest-client/arc-types').ArcRequest.ArcBaseRequest} ArcBaseRequest */
/** @typedef {import('../../lib/RequestOptions').Options} Options */

describe('Timeout test', () => {
  const requestId = 'test id';
  const requests = /** @type ArcBaseRequest[] */ ([{
    url: 'http://localhost/delay/1',
    method: 'GET',
  }, {
    url: 'http://localhost/delay/1',
    method: 'GET',
    config: {
      timeout: 500,
    },
  }]);
  const opts = /** @type Options */ ([{
    timeout: 500,
    followRedirects: false,
  }]);

  it('timeouts the request from the class options', (done) => {
    const request = new ElectronRequest(requests[0], requestId, opts[0]);
    request.once('load', () => done(new Error('Should not load')));
    request.once('error', () => done());
    request.send();
  });

  it('Timeouts the request from request options', (done) => {
    const request = new ElectronRequest(requests[1], requestId);
    request.once('load', () => done(new Error('Should not load')));
    request.once('error', () => done());
    request.send();
  });

  it('has the id on the error', (done) => {
    const request = new ElectronRequest(requests[1], requestId);
    request.once('load', () => done(new Error('Should not load')));
    request.once('error', (err, id) => {
      assert.equal(id, requestId);
      done();
    });
    request.send();
  });
});
