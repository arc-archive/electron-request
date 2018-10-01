const assert = require('chai').assert;
const {BaseRequest} = require('../../lib/base-request');

describe('BaseRequest - cleaning up', function() {
  const requestData = {
    method: 'GET',
    url: 'https://domain.com',
    id: 'test-id'
  };

  it('_cleanUp()', () => {
    const base = new BaseRequest(requestData);
    base.redirects = [];
    base._response = {};
    base._rawBody = Buffer.from('test');
    base.stats = {time: Date.now()};
    base._cleanUp();
    assert.isUndefined(base.redirects);
    assert.isUndefined(base._response);
    assert.isUndefined(base._rawBody);
    assert.deepEqual(base.stats, {});
  });

  it('_cleanUpRedirect()', () => {
    const base = new BaseRequest(requestData);
    base.redirects = ['test'];
    base._response = {};
    base._rawBody = Buffer.from('test');
    base.stats = {time: Date.now()};
    base._cleanUpRedirect();
    assert.deepEqual(base.redirects, ['test']);
    assert.isUndefined(base._response);
    assert.isUndefined(base._rawBody);
    assert.deepEqual(base.stats, {});
  });
});
