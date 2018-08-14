const _FormData = require('form-data');

let target;

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

function _appendBlob(name, data) {
  return blob2ab(data)
  .then((buffer) => {
    const opts = {
      contentType: data.type,
      knownLength: data.size
    };
    if (data.name && data.name !== 'blob') {
      opts.filename = data.name;
    }
    target.append(name, buffer, opts);
  });
}

function _append(name, value) {
  if (value instanceof Blob) {
    return _appendBlob(name, value);
  }
  return Promise.resolve(target.append(name, value));
}

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
        let sum = result.length + data.length;
        result = Buffer.concat([result, data], sum);
      }
    });
    target.on('error', (err) => reject(err));
    target.on('end', () => {
      let ct = target.getHeaders()['content-type'];
      resolve({
        buffer: result,
        type: ct
      });
    });
    target.resume();
  });
}

module.exports = function(data) {
  target = new _FormData();
  const promises = [];
  data.forEach((value, name) => {
    promises.push(_append(name, value));
  });
  return Promise.all(promises)
  .then(() => _getData());
};
