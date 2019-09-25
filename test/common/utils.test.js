const assert = require('chai').assert;
const { RequestUtils } = require('../../');
const { ArcHeaders } = require('../../');

describe('RequestUtils tests', function() {
  const requests = [{
    id: 'r-2',
    url: `http://localhost:1234/api/endpoint?query=param`,
    method: 'POST',
    headers: 'content-type: text/plain',
    payload: Buffer.from([0x74, 0x65, 0x73, 0x74, 0x0a, 0x74, 0x65, 0x73, 0x74]),
  }, {
    id: 'r-3',
    url: `http://localhost:1234/api/endpoint?query=param`,
    method: 'GET',
    headers: 'Host: test.com',
  }];
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

  describe('_addContentLength()', function() {
    let headers;
    beforeEach(() => {
      headers = new ArcHeaders();
    });

    it('Adds content length header', function() {
      RequestUtils.addContentLength(requests[0].method, requests[0].payload, headers);
      assert.equal(headers.get('content-length'), 9);
    });

    it('Do nothing for GET requests', function() {
      RequestUtils.addContentLength(requests[1].method, requests[1].payload, headers);
      assert.isFalse(headers.has('content-length'));
    });
  });

  describe('redirectOptions()', () => {
    [300, 304, 305].forEach((code) => {
      it('Do not set redirect flag for ' + code, () => {
        const result = RequestUtils.redirectOptions(code);
        assert.isFalse(result.redirect);
      });

      it('Do not set forceGet flag for ' + code, () => {
        const result = RequestUtils.redirectOptions(code);
        assert.isFalse(result.forceGet);
      });
    });

    [301, 302, 307].forEach((code) => {
      it(`Redirects ${code} for HEAD method`, () => {
        const result = RequestUtils.redirectOptions(code, 'HEAD');
        assert.isTrue(result.redirect);
      });

      it(`Redirects ${code} for GET method`, () => {
        const result = RequestUtils.redirectOptions(code, 'GET');
        assert.isTrue(result.redirect);
      });

      it(`Do not redirects ${code} for other method`, () => {
        const result = RequestUtils.redirectOptions(code, 'POST');
        assert.isFalse(result.redirect);
      });

      it(`Do not set forceGet for ${code} status`, () => {
        const result = RequestUtils.redirectOptions(code, 'GET');
        assert.isFalse(result.forceGet);
      });
    });

    it(`Adds redirect location`, () => {
      const result = RequestUtils.redirectOptions(301, 'GET', 'domain.com');
      assert.equal(result.location, 'domain.com');
    });

    it('Sets forceGet for 303 status', () => {
      const result = RequestUtils.redirectOptions(303, 'GET');
      assert.isTrue(result.forceGet);
    });
  });

  describe('isRedirectLoop()', () => {
    const url = 'https://domain.com';
    it('Returns false when no redirects', () => {
      const result = RequestUtils.isRedirectLoop(url);
      assert.isFalse(result);
    });

    it('Returns false when redirects is empty', () => {
      const result = RequestUtils.isRedirectLoop(url, new Set());
      assert.isFalse(result);
    });

    it('Returns false when url is not on the list', () => {
      const result = RequestUtils.isRedirectLoop(url, new Set([{
        url: 'other.com',
      }]));
      assert.isFalse(result);
    });

    it('Returns true when url is on the list', () => {
      const result = RequestUtils.isRedirectLoop(url, new Set([{
        url,
      }]));
      assert.isTrue(result);
    });
  });

  describe('getRedirectLocation()', () => {
    it('Returns the same valid url', () => {
      const url = 'https://domain.com/path?a=b';
      const result = RequestUtils.getRedirectLocation(url);
      assert.equal(result, url);
    });

    it('Resolves relative URL', () => {
      const url = '/path?a=b';
      const base = 'https://domain.com/other';
      const compare = 'https://domain.com/path?a=b';
      const result = RequestUtils.getRedirectLocation(url, base);
      assert.equal(result, compare);
    });

    it('Returns undefined for unknown state', () => {
      const url = '/path?a=b';
      const base = '/other';
      const result = RequestUtils.getRedirectLocation(url, base);
      assert.isUndefined(result);
    });
  });
});
