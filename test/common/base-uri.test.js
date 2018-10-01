const assert = require('chai').assert;
const {BaseRequest} = require('../../lib/base-request');

describe('BaseRequest uri', function() {
  const requestData = {
    method: 'GET',
    url: 'https://domain.com',
    id: 'test-id'
  };

  it('Uri is parsed URL', () => {
    const request = new BaseRequest(requestData);
    assert.typeOf(request.uri, 'object');
    assert.equal(request.uri.hostname, 'domain.com');
  });

  it('Change uri', () => {
    const request = new BaseRequest(requestData);
    request.uri = 'http://other.com';
    assert.typeOf(request.uri, 'object');
    assert.equal(request.uri.hostname, 'other.com');
  });

  it('Applies host rules', () => {
    const hosts = [{from: 'domain.com', to: 'other.com'}];
    const request = new BaseRequest(requestData, {
      hosts
    });
    assert.equal(request.uri.hostname, 'other.com');
  });
});
