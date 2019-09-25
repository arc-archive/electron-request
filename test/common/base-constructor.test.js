const assert = require('chai').assert;
const { BaseRequest } = require('../../');
const { RequestOptions } = require('../../');

describe('BaseRequest constructor', function() {
  const requestData = {
    method: 'GET',
    url: 'https://domain.com',
    id: 'test-id',
  };

  it('Sets options', () => {
    const request = new BaseRequest(requestData);
    assert.isTrue(request.opts instanceof RequestOptions);
  });

  it('Sets logger', () => {
    const request = new BaseRequest(requestData);
    assert.typeOf(request.logger, 'object');
  });

  it('Sets arcRequest', () => {
    const request = new BaseRequest(requestData);
    assert.typeOf(request.arcRequest, 'object');
  });

  it('arcRequest is a copy', () => {
    const request = new BaseRequest(requestData);
    request.arcRequest.url = 'test';
    assert.equal(requestData.url, 'https://domain.com');
  });

  it('Sets aborted', () => {
    const request = new BaseRequest(requestData);
    assert.isFalse(request.aborted);
  });

  it('Sets id', () => {
    const request = new BaseRequest(requestData);
    assert.equal(request.id, 'test-id');
  });

  it('Sets stats to empy object', () => {
    const request = new BaseRequest(requestData);
    assert.typeOf(request.stats, 'object');
    assert.lengthOf(Object.keys(request.stats), 0);
  });

  it('Sets hosts', () => {
    const hosts = [{ from: 'a', to: 'b' }];
    const request = new BaseRequest(requestData, {
      hosts,
    });
    assert.deepEqual(request.hosts, hosts);
  });

  it('Sets uri', () => {
    const request = new BaseRequest(requestData);
    assert.typeOf(request.uri, 'object');
  });

  it('Sets hostHeader', () => {
    const request = new BaseRequest(requestData);
    assert.equal(request.hostHeader, 'domain.com');
  });

  it('Sets _hostTestReg', () => {
    const request = new BaseRequest(requestData);
    assert.typeOf(request._hostTestReg, 'regexp');
  });
});
