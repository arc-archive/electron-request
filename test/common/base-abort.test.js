const assert = require('chai').assert;
const net = require('net');
const { BaseRequest } = require('../../');

describe('BaseRequest - abort', function() {
  const requestData = {
    method: 'GET',
    url: 'localhost',
    id: 'test-id',
  };

  function setupSocket(base) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket({
        writable: true,
      });
      socket.connect(80, 'localhost', () => {
        base.socket = socket;
        resolve();
      });
      socket.on('error', (e) => {
        reject(new Error('Unable to connect'));
      });
    });
  }

  it('Sets aborted flag', () => {
    const base = new BaseRequest(requestData);
    base.abort();
    assert.isTrue(base.aborted);
  });

  it('Destroys the socket', () => {
    const base = new BaseRequest(requestData);
    return setupSocket(base)
        .then(() => {
          base.abort();
          assert.isUndefined(base.socket);
        });
  });

  it('Removes destroyed socket', () => {
    const base = new BaseRequest(requestData);
    return setupSocket(base)
        .then(() => {
          base.socket.pause();
          base.socket.destroy();
          base.abort();
          assert.isUndefined(base.socket);
        });
  });

  it('_decompress() results to undefined', () => {
    const request = new BaseRequest(requestData);
    request.abort();
    return request._decompress(Buffer.from('test'))
        .then((result) => {
          assert.isUndefined(result);
        });
  });

  it('_createResponse() results to undefined', () => {
    const request = new BaseRequest(requestData);
    request.abort();
    return request._createResponse()
        .then((result) => {
          assert.isUndefined(result);
        });
  });
});
