const assert = require('chai').assert;
const zlib = require('zlib');
const { BaseRequest } = require('../../');
const { ArcHeaders } = require('../../');

describe('Decompression', function() {
  function createDeflate(str) {
    return zlib.deflateSync(Buffer.from(str || 'deflate-string'));
  }

  function createGzip(str) {
    return zlib.gzipSync(Buffer.from(str || 'gzip-string'));
  }

  function createBrotli(str) {
    return zlib.brotliCompressSync(Buffer.from(str || 'brotli-string'));
  }

  const requestData = {
    method: 'GET',
    url: 'https://domain.com',
    id: 'test-id',
  };
  describe('_inflate()', () => {
    it('Returns a promise', () => {
      const request = new BaseRequest(requestData);
      const result = request._inflate(createDeflate());
      assert.typeOf(result.then, 'function');
      return result.then(() => {});
    });

    it('Promise resolves to buffer', () => {
      const request = new BaseRequest(requestData);
      return request._inflate(createDeflate())
          .then((result) => {
            assert.equal(result.length, 14);
          });
    });

    it('Buffer has original data', () => {
      const request = new BaseRequest(requestData);
      return request._inflate(createDeflate())
          .then((result) => {
            assert.equal(result.toString(), 'deflate-string');
          });
    });
  });

  describe('_gunzip()', () => {
    it('Returns a promise', () => {
      const request = new BaseRequest(requestData);
      const result = request._gunzip(createGzip());
      assert.typeOf(result.then, 'function');
      return result.then(() => {});
    });

    it('Promise resolves to buffer', () => {
      const request = new BaseRequest(requestData);
      return request._gunzip(createGzip())
          .then((result) => {
            assert.equal(result.length, 11);
          });
    });

    it('Buffer has original data', () => {
      const request = new BaseRequest(requestData);
      return request._gunzip(createGzip())
          .then((result) => {
            assert.equal(result.toString(), 'gzip-string');
          });
    });
  });

  describe('_brotli()', () => {
    it('Returns a promise', () => {
      const request = new BaseRequest(requestData);
      const result = request._brotli(createBrotli());
      assert.typeOf(result.then, 'function');
      return result.then(() => {});
    });

    it('Promise resolves to buffer', () => {
      const request = new BaseRequest(requestData);
      return request._brotli(createBrotli())
          .then((result) => {
            assert.equal(result.length, 13);
          });
    });

    it('Buffer has original data', () => {
      const request = new BaseRequest(requestData);
      return request._brotli(createBrotli())
          .then((result) => {
            assert.equal(result.toString(), 'brotli-string');
          });
    });
  });

  describe('_decompress()', () => {
    it('Returns a promise', () => {
      const request = new BaseRequest(requestData);
      const result = request._decompress();
      assert.typeOf(result.then, 'function');
      return result.then(() => {});
    });

    it('Results to undefined when no data', () => {
      const request = new BaseRequest(requestData);
      return request._decompress()
          .then((result) => {
            assert.isUndefined(result);
          });
    });

    it('Results to undefined when aborted', () => {
      const request = new BaseRequest(requestData);
      request.aborted = true;
      return request._decompress(Buffer.from('test'))
          .then((result) => {
            assert.isUndefined(result);
          });
    });

    it('Results to the same buffer when no content-encoding header', () => {
      const b = Buffer.from('test');
      const request = new BaseRequest(requestData);
      request._response = {
        _headers: new ArcHeaders(),
      };
      return request._decompress(b)
          .then((result) => {
            assert.equal(result.compare(b), 0);
          });
    });

    it('Decompresses deflate', () => {
      const b = createDeflate();
      const request = new BaseRequest(requestData);
      request._response = {
        _headers: new ArcHeaders('content-encoding: deflate'),
      };
      return request._decompress(b)
          .then((result) => {
            assert.equal(result.toString(), 'deflate-string');
          });
    });

    it('Decompresses gzip', () => {
      const b = createGzip();
      const request = new BaseRequest(requestData);
      request._response = {
        _headers: new ArcHeaders('content-encoding: gzip'),
      };
      return request._decompress(b)
          .then((result) => {
            assert.equal(result.toString(), 'gzip-string');
          });
    });

    it('Decompresses brotli', () => {
      const b = createBrotli();
      const request = new BaseRequest(requestData);
      request._response = {
        _headers: new ArcHeaders('content-encoding: br'),
      };
      return request._decompress(b)
          .then((result) => {
            assert.equal(result.toString(), 'brotli-string');
          });
    });
  });
});
