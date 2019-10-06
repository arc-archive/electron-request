const assert = require('chai').assert;
const { ElectronRequest } = require('../../');

describe('Redirects test', function() {
  const requests = [{
    id: 'r-1',
    url: 'http://localhost/absolute-redirect/2',
    method: 'GET',
  }, {
    id: 'r-2',
    url: 'http://localhost/relative-redirect/2',
    method: 'GET',
  }, {
    id: 'r-3',
    url: 'http://localhost/relative-redirect/1',
    method: 'GET',
  }];
  const opts = [{
    followRedirects: true,
  }];

  it('Redirects with absolute URL', function(done) {
    const request = new ElectronRequest(requests[0], opts[0]);
    request.once('load', (id, response) => {
      assert.equal(id, requests[0].id);
      assert.typeOf(response.redirects, 'array');
      assert.lengthOf(response.redirects, 2);
      done();
    });
    request.once('error', (e) => done(e));
    request.send().catch((e) => done(e));
  });

  it('Redirects with relative URL', function(done) {
    const request = new ElectronRequest(requests[1], opts[0]);
    request.once('load', (id, response) => {
      assert.equal(id, requests[1].id);
      assert.typeOf(response.redirects, 'array');
      assert.lengthOf(response.redirects, 2);
      done();
    });
    request.once('error', (e) => done(e));
    request.send().catch((e) => done(e));
  });

  it('Redirect is a response object', function(done) {
    const request = new ElectronRequest(requests[2], opts[0]);
    request.once('load', (id, response) => {
      const r = response.redirects[0];
      assert.typeOf(r, 'object');
      assert.equal(r.status, 302);
      assert.equal(r.statusText, 'FOUND');
      assert.typeOf(r.headers, 'string');
      assert.equal(r.url, 'http://localhost/relative-redirect/1');
      assert.typeOf(r.stats, 'object');
      done();
    });
    request.once('error', (e) => done(e));
    request.send().catch((e) => done(e));
  });
});
