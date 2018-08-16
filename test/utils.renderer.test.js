const assert = require('chai').assert;
const {RequestUtils} = require('../lib/utils');

describe('RequestUtils tests', function() {
  describe('getPort()', function() {
    it('Returns number when number is passed', function() {
      const result = RequestUtils.getPort(20);
      assert.equal(result, 20);
    });

    it('Returns number when number is a string', function() {
      const result = RequestUtils.getPort('20');
      assert.equal(result, 20);
    });

    it('Returns 443 port from the protocol', function() {
      const result = RequestUtils.getPort(0, 'https:');
      assert.equal(result, 443);
    });

    it('Returns 80 port from the protocol', function() {
      const result = RequestUtils.getPort(undefined, 'http:');
      assert.equal(result, 80);
    });
  });
  describe('getHostHeader()', function() {
    it('Returns host with SSL port', function() {
      const result = RequestUtils.getHostHeader('https://domain.com/path');
      assert.equal(result, 'domain.com');
    });

    it('Returns host with http port', function() {
      const result = RequestUtils.getHostHeader('http://domain.com/path');
      assert.equal(result, 'domain.com');
    });

    it('Respects existing port', function() {
      const result = RequestUtils.getHostHeader('https://domain.com:123/path');
      assert.equal(result, 'domain.com:123');
    });
  });
});
