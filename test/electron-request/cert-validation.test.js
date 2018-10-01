const assert = require('chai').assert;
const {ElectronRequest} = require('../../');

describe('Responses test', function() {
  const requests = [{
    id: 'r-1',
    url: 'http://localhost/image',
    method: 'GET'
  }];
  const opts = [{
    validateCertificates: false
  }, {
    validateCertificates: true
  }];

  [
    ['expired', 'https://expired.badssl.com'],
    ['wrong host', 'https://wrong.host.badssl.com/'],
    ['self signed', 'https://self-signed.badssl.com/'],
    ['untrusted root', 'https://untrusted-root.badssl.com/'],
    // ['revoked', 'https://revoked.badssl.com/'],
    // ['pinned', 'https://pinning-test.badssl.com/']
  ].forEach((item, index) => {
    let [name, url] = item;
    it('Reads certificate: ' + name, (done) => {
      const request = new ElectronRequest({
        id: 'r-' + index,
        url,
        method: 'GET'
      }, opts[0]);
      request.once('load', () => done());
      request.once('error', (err) => done(err));
      request.send();
    });

    it(`Rejects ${name} cert with validation enabled`, (done) => {
      const request = new ElectronRequest({
        id: 'r-' + index,
        url,
        method: 'GET'
      }, opts[1]);
      request.once('load', () => {
        done(new Error('Should not load'));
      });
      request.once('error', () => done());
      request.send();
    });
  });

  it('Error has ID', function(done) {
    const request = new ElectronRequest(requests[0], opts[1]);
    request.once('load', () => done());
    request.once('error', (err, id) => {
      assert.equal(id, requests[0].id);
      done();
    });
    request.send();
  });
});
