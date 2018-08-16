const formDataConventer = require('./form-data');
/**
 * A class containning static helper methods to deal with Payload
 * transformations
 */
class PayloadSupport {
  /**
   * Transfers blob to `ArrayBuffer`.
   *
   * @param {Blob} blob A blob object to transform
   * @return {Promise} A promise resolved to a `Buffer`
   */
  static blob2buffer(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('loadend', (e) => {
        resolve(Buffer.from(e.target.result));
      });
      reader.addEventListener('error', (e) => {
        reject(e.message);
      });
      reader.readAsArrayBuffer(blob);
    });
  }
  /**
   * NormalizeLineEndingsToCRLF
   * https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/
   * platform/text/LineEnding.cpp&rcl=1458041387&l=101
   *
   * @param {String} string A string to be normalized.
   * @return {String} normalized string
   */
  static normalizeString(string) {
    let result = '';
    for (let i = 0; i < string.length; i++) {
      let c = string[i];
      let p = string[i + 1];
      if (c === '\r') {
        // Safe to look ahead because of trailing '\0'.
        if (p && p !== '\n') {
          // Turn CR into CRLF.
          result += '\r';
          result += '\n';
        }
      } else if (c === '\n') {
        result += '\r';
        result += '\n';
      } else {
        // Leave other characters alone.
        result += c;
      }
    }
    return result;
  }
  /**
   * Tranforms a payload message into `Buffer`
   *
   * @param {String|Blob|ArrayBuffer|FormData} payload A payload message
   * @param {ArcHeaders} headers A headers object where to append headers if
   * needed
   * @return {Promise} A promise resolved to a `Buffer`.
   */
  static payloadToBuffer(payload, headers) {
    if (!payload) {
      return Promise.resolve();
    }
    if (typeof payload === 'string') {
      payload = PayloadSupport.normalizeString(payload);
      return Promise.resolve(Buffer.from(payload, 'utf8'));
    }
    if (payload instanceof ArrayBuffer) {
      return Promise.resolve(Buffer.from(payload));
    }
    if (payload instanceof Buffer) {
      return Promise.resolve(payload);
    }
    if (payload instanceof FormData) {
      return formDataConventer(payload)
      .then((result) => {
        headers.set('Content-Type', result.type);
        return result.buffer;
      });
    }
    if (payload instanceof Blob) {
      if (!headers.has('content-type') && payload.type) {
        headers.set('content-type', payload.type);
      }
      return PayloadSupport.blob2buffer(payload);
    }
    return Promise.reject(new Error('Unsupported payload message'));
  }
}
module.exports.PayloadSupport = PayloadSupport;
