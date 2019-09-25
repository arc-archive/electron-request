import _FormData from 'form-data';

let target;
/**
 * Transforms File to array buffer.
 * @param {Blob} blob
 * @return {Promise}
 */
function blob2ab(blob) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.addEventListener('load', (e) => {
      resolve(Buffer.from(e.target.result));
    });
    fileReader.addEventListener('error', () => {
      reject(new Error('Unable to read file data'));
    });
    fileReader.readAsArrayBuffer(blob);
  });
}
/**
 * Adds a file to the form.
 * @param {String} name
 * @param {Blob} data
 * @return {Promise}
 */
async function _appendBlob(name, data) {
  const buffer = await blob2ab(data);
  const opts = {
    contentType: data.type,
    knownLength: data.size,
  };
  if (data.name && data.name !== 'blob') {
    opts.filename = data.name;
  }
  target.append(name, buffer, opts);
}
/**
 * Adds a part to the form.
 * @param {String} name
 * @param {Blob|String} value
 * @return {Promise}
 */
async function _append(name, value) {
  if (value instanceof Blob) {
    return await _appendBlob(name, value);
  }
  target.append(name, value);
}
/**
 * @return {Promise}
 */
function _getData() {
  return new Promise((resolve, reject) => {
    let result;
    target.on('data', (data) => {
      if (!(data instanceof Buffer)) {
        data = Buffer.from(data);
      }
      if (!result) {
        result = data;
      } else {
        const sum = result.length + data.length;
        result = Buffer.concat([result, data], sum);
      }
    });
    target.on('error', (err) => reject(err));
    target.on('end', () => {
      const ct = target.getHeaders()['content-type'];
      resolve({
        buffer: result,
        type: ct,
      });
    });
    target.resume();
  });
}
/**
 * @param {Array} data
 * @return {Promise}
 */
export default async function(data) {
  target = new _FormData();
  const promises = [];
  data.forEach((value, name) => {
    promises.push(_append(name, value));
  });
  return Promise.all(promises).then(() => _getData());
};
