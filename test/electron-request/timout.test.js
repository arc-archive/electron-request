const assert = require('chai').assert;
const {ElectronRequest} = require('../../');

describe('Timeout test', function() {
  const requests = [{
    id: 'r-1',
    url: 'http://localhost/delay/1',
    method: 'GET'
  }, {
    id: 'r-2',
    url: 'http://localhost/delay/1',
    method: 'GET',
    config: {
      timeout: 500
    }
  }];
  const opts = [{
    timeout: 500,
    followRedirects: false
  }];

  it('Timeouts the request from class options', function(done) {
    const request = new ElectronRequest(requests[0], opts[0]);
    request.once('load', () => done(new Error('Should not load')));
    request.once('error', () => done());
    request.send();
  });

  it('Timeouts the request from request options', function(done) {
    const request = new ElectronRequest(requests[1]);
    request.once('load', () => done(new Error('Should not load')));
    request.once('error', () => done());
    request.send();
  });

  it('Error has ID', function(done) {
    const request = new ElectronRequest(requests[1]);
    request.once('load', () => done(new Error('Should not load')));
    request.once('error', (err, id) => {
      assert.equal(id, requests[1].id);
      done();
    });
    request.send();
  });
});
