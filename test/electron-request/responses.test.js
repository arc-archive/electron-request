const assert = require('chai').assert;
const { ElectronRequest } = require('../../');

describe('Responses test', function() {
  [
    ['Image - jpeg', 'http://localhost/image/jpeg'],
    ['Image - png', 'http://localhost/image/png'],
    ['Image - svg', 'http://localhost/image/svg'],
    ['Image - webp', 'http://localhost/image/webp'],
    ['Bytes', 'http://localhost/stream-bytes/120'],
    ['JSON', 'http://localhost/get'],
    ['after a second', 'http://localhost/delay/1'],
    ['brotli', 'http://localhost/brotli'],
    ['deflate', 'http://localhost/deflate'],
    ['gzip', 'http://localhost/gzip'],
    ['html', 'http://localhost/html'],
    ['json (2)', 'http://localhost/json'],
    ['xml', 'http://localhost/xml'],
  ].forEach((item, index) => {
    const [name, url] = item;
    it('Reads the response: ' + name, (done) => {
      const id = 'r-' + index;
      const request = new ElectronRequest({
        id,
        url,
        method: 'GET',
      });
      request.once('load', (rid, response) => {
        assert.equal(rid, id);
        assert.ok(response.payload);
        done();
      });
      request.once('error', (err) => done(err));
      request.send();
    });
  });
});

describe('Stats tests', function() {
  it('Has stast object', (done) => {
    const request = new ElectronRequest({
      id: 'test',
      url: 'http://localhost/get',
      method: 'GET',
    });
    request.once('load', (id, response) => {
      assert.typeOf(response.stats, 'object');
      done();
    });
    request.once('error', (err) => done(err));
    request.send();
  });

  ['connect', 'receive', 'send', 'wait', 'dns', 'ssl']
      .forEach((prop) => {
        it(`Has ${prop} value`, (done) => {
          const request = new ElectronRequest({
            id: 'test',
            url: 'http://localhost/get',
            method: 'GET',
          });
          request.once('load', (id, response) => {
            assert.typeOf(response.stats[prop], 'number');
            done();
          });
          request.once('error', (err) => done(err));
          request.send();
        });
      });

  it('Has stats time for ssl', (done) => {
    const request = new ElectronRequest({
      id: 'test',
      url: 'https://www.google.com/',
      method: 'GET',
    });
    request.once('load', (id, response) => {
      assert.isAbove(response.stats.ssl, -1);
      done();
    });
    request.once('error', (err) => done(err));
    request.send();
  });
});
