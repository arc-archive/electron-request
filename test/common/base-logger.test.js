const assert = require('chai').assert;
const { BaseRequest } = require('../../');

describe('BaseRequest - logger', function() {
  const requestData = {
    method: 'GET',
    url: 'https://domain.com',
    id: 'test-id',
  };

  it('Sets default logger', () => {
    const base = new BaseRequest(requestData);
    const result = base.__setupLogger({});
    assert.typeOf(result, 'object');
    assert.typeOf(result.info, 'function');
    assert.typeOf(result.log, 'function');
    assert.typeOf(result.warn, 'function');
    assert.typeOf(result.error, 'function');
  });

  it('Sets passed logger option', () => {
    const base = new BaseRequest(requestData);
    const result = base.__setupLogger({
      logger: console,
    });
    assert.isTrue(result === console);
  });
});
