/** @typedef {import('../main.js').SocketRequest} SocketRequest */
/** @typedef {import('../main.js').ElectronRequest} ElectronRequest */
/**
 * @param {SocketRequest|ElectronRequest} request
 * @return {Promise}
 */
async function untilResponse(request) {
  return new Promise((resolve, reject) => {
    request.on('error', (error) => {
      reject(error);
    });
    request.on('load', (id, response, request) => {
      resolve({
        id,
        response,
        request,
      });
    });
  });
}
/**
 * @param {SocketRequest|ElectronRequest} request
 * @return {Promise}
 */
async function untilBody(request) {
  return new Promise((resolve, reject) => {
    request.on('error', (error) => {
      reject(error);
    });
    request.on('load', (id, response) => {
      const { payload } = response;
      const body = payload.toString('utf8');
      resolve(JSON.parse(body));
    });
  });
}

module.exports.untilResponse = untilResponse;
module.exports.untilBody = untilBody;
