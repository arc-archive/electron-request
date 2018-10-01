const assert = require('chai').assert;
const {PayloadSupport} = require('../../lib/payload-support');
const {ArcHeaders} = require('../../lib/arc-headers');

describe('PayloadSupport tests', function() {
  describe('blob2buffer()', function() {
    const blob = new Blob(['abc'], {type: 'text/plain'});

    it('Returns a promise', () => {
      const result = PayloadSupport.blob2buffer(blob);
      assert.typeOf(result.then, 'function');
      return result.then(() => {});
    });

    it('Promise resolves to a buffer', () => {
      return PayloadSupport.blob2buffer(blob)
      .then((result) => {
        assert.isTrue(result instanceof Buffer);
      });
    });

    it('Buffer has blob\'s data', () => {
      return PayloadSupport.blob2buffer(blob)
      .then((result) => {
        const compare = Buffer.from([97, 98, 99]);
        assert.equal(result.compare(compare), 0);
      });
    });
  });

  describe('normalizeString()', function() {
    it('Normalizes LF', function() {
      const str = 'a\nb\nc';
      const result = PayloadSupport.normalizeString(str);
      assert.equal(result, 'a\r\nb\r\nc');
    });

    it('Normalizes CR', function() {
      const str = 'a\rb\rc';
      const result = PayloadSupport.normalizeString(str);
      assert.equal(result, 'a\r\nb\r\nc');
    });

    it('Normalizes CRLF', function() {
      const str = 'a\r\nb\r\nc';
      const result = PayloadSupport.normalizeString(str);
      assert.equal(result, 'a\r\nb\r\nc');
    });
  });

  describe('payloadToBuffer()', function() {
    let headers;
    beforeEach(() => {
      headers = new ArcHeaders();
    });

    it('Returns a promise', () => {
      const result = PayloadSupport.payloadToBuffer(undefined, headers);
      assert.typeOf(result.then, 'function');
      return result.then(() => {});
    });

    it('Returns undefined if no data', () => {
      return PayloadSupport.payloadToBuffer(undefined, headers)
      .then((result) => {
        assert.isUndefined(result);
      });
    });

    it('Returns normalized string buffer', () => {
      return PayloadSupport.payloadToBuffer('a\nb\nc', headers)
      .then((result) => {
        assert.equal(result.compare(Buffer.from('a\r\nb\r\nc')), 0);
      });
    });

    it('Returns buffer from array buffer', function() {
      const typed = new Uint8Array([97, 98, 99]);
      return PayloadSupport.payloadToBuffer(typed.buffer, headers)
      .then((result) => {
        const compare = Buffer.from([97, 98, 99]);
        assert.equal(result.compare(compare), 0);
      });
    });

    it('Returns buffer for FormData', () => {
      const fd = new FormData();
      fd.append('a', 'b');
      return PayloadSupport.payloadToBuffer(fd, headers)
      .then((result) => {
        const strValue = result.toString();
        const val = 'Content-Disposition: form-data; name="a"\r\n\r\nb';
        assert.notEqual(strValue.indexOf(val), -1);
      });
    });

    it('FormData sets content type header', () => {
      const fd = new FormData();
      fd.append('a', 'b');
      headers.set('Content-type', 'x-type');
      return PayloadSupport.payloadToBuffer(fd, headers)
      .then(() => {
        assert.notEqual(headers.get('content-type'), 'x-type');
      });
    });

    it('Creates buffer from blob', () => {
      const blob = new Blob(['abc'], {type: 'text/plain'});
      return PayloadSupport.payloadToBuffer(blob, headers)
      .then((result) => {
        const compare = Buffer.from([97, 98, 99]);
        assert.equal(result.compare(compare), 0);
      });
    });

    it('Sets content type from blob', () => {
      const blob = new Blob(['abc'], {type: 'text/x-plain'});
      return PayloadSupport.payloadToBuffer(blob, headers)
      .then(() => {
        assert.equal(headers.get('content-type'), 'text/x-plain');
      });
    });

    it('Ignores blob\'s type if content-type is set', () => {
      const blob = new Blob(['abc'], {type: 'text/x-plain'});
      headers.set('Content-type', 'x-type');
      return PayloadSupport.payloadToBuffer(blob, headers)
      .then(() => {
        assert.equal(headers.get('content-type'), 'x-type');
      });
    });
  });
});
