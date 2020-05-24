const { assert } = require('chai');
const { BaseRequest } = require('../../');

describe('BaseRequest uri', () => {
  const requestData = {
    method: 'GET',
    url: 'https://domain.com',
    id: 'test-id',
  };

  it('uri is parsed URL', () => {
    const request = new BaseRequest(requestData);
    assert.typeOf(request.uri, 'object');
    assert.equal(request.uri.hostname, 'domain.com');
  });

  it('changes uri', () => {
    const request = new BaseRequest(requestData);
    request._updateUrl('http://other.com');
    assert.typeOf(request.uri, 'object');
    assert.equal(request.uri.hostname, 'other.com');
  });

  it('applies host rules', () => {
    const hosts = [{ from: 'domain.com', to: 'other.com' }];
    const request = new BaseRequest(requestData, {
      hosts,
    });
    assert.equal(request.uri.hostname, 'other.com');
  });
});
