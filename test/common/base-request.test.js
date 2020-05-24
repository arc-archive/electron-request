const { assert } = require('chai');
const { BaseRequest, ArcHeaders } = require('../../');

describe('BaseRequest', () => {
  describe('_prepareHeaders()', () => {
    let request;
    let opts;
    beforeEach(() => {
      request = {
        url: 'https://api.domain.com',
        method: 'GET',
        headers: '',
      };
      opts = {
        defaultHeaders: true,
      };
    });

    it('adds default user-agent', () => {
      const base = new BaseRequest(request, opts);
      const headers = new ArcHeaders();
      base._prepareHeaders(headers);
      assert.equal(headers.get('user-agent'), 'advanced-rest-client');
    });

    it('adds default accept', () => {
      const base = new BaseRequest(request, opts);
      const headers = new ArcHeaders();
      base._prepareHeaders(headers);
      assert.equal(headers.get('accept'), '*/*');
    });

    it('adds configured user-agent', () => {
      opts.defaultUserAgent = 'test';
      const base = new BaseRequest(request, opts);
      const headers = new ArcHeaders();
      base._prepareHeaders(headers);
      assert.equal(headers.get('user-agent'), 'test');
    });

    it('adds configured accept', () => {
      opts.defaulAccept = 'test';
      const base = new BaseRequest(request, opts);
      const headers = new ArcHeaders();
      base._prepareHeaders(headers);
      assert.equal(headers.get('accept'), 'test');
    });

    it('ignores adding headers when no config option', () => {
      opts.defaultHeaders = false;
      const base = new BaseRequest(request, opts);
      const headers = new ArcHeaders();
      base._prepareHeaders(headers);
      assert.isFalse(headers.has('user-agent'), 'user-agent is not set');
      assert.isFalse(headers.has('accept'), 'accept is not set');
    });

    it('skips when user-agent header is set', () => {
      const base = new BaseRequest(request, opts);
      const headers = new ArcHeaders({
        'user-agent': 'test',
      });
      base._prepareHeaders(headers);
      assert.equal(headers.get('user-agent'), 'test');
    });

    it('skips when accept header is set', () => {
      const base = new BaseRequest(request, opts);
      const headers = new ArcHeaders({
        accept: 'test',
      });
      base._prepareHeaders(headers);
      assert.equal(headers.get('accept'), 'test');
    });
  });
});
