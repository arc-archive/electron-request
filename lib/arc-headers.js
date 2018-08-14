/* global Headers */
function normalizeName(name) {
  if (typeof name !== 'string') {
    name = String(name);
  }
  return name.toLowerCase();
}

function normalizeValue(value) {
  if (typeof value !== 'string') {
    value = String(value);
  }
  return value;
}

function* headersStringToList(string) {
  if (!string || string.trim() === '') {
    return [];
  }
  const headers = string.split(/\n(?=[^ \t]+)/gim);
  for (let i = 0, len = headers.length; i < len; i++) {
    const line = headers[i].trim();
    if (line === '') {
      continue;
    }
    const sepPosition = line.indexOf(':');
    if (sepPosition === -1) {
      yield [line, ''];
    } else {
      const name = line.substr(0, sepPosition);
      const value = line.substr(sepPosition + 1).trim();
      yield [name, value];
    }
  }
}
/**
 * ARC version of headers interface.
 * It supports ARC API.
 */
class ArcHeaders {
  constructor(headers) {
    this.map = {};
    if (headers instanceof ArcHeaders || headers instanceof Headers) {
      headers.forEach((value, name) => this.append(name, value));
    } else if (Array.isArray(headers)) {
      headers.forEach((header) => this.append(header[0], header[1]));
    } else if (typeof headers === 'string') {
      const iterator = headersStringToList(headers);
      let result = iterator.next();
      while (!result.done) {
        this.append(result.value[0], result.value[1]);
        result = iterator.next();
      }
    } else if (headers) {
      Object.keys(headers).forEach((name) => this.append(name, headers[name]));
    }
  }

  append(name, value) {
    const normalizedName = normalizeName(name);
    value = normalizeValue(value);
    let item = this.map[normalizedName];
    if (item) {
      const oldValue = item.value;
      item.value = oldValue ? oldValue + ',' + value : value;
    } else {
      item = {
        name: name,
        value
      };
    }
    this.map[normalizedName] = item;
  }

  delete(name) {
    delete this.map[normalizeName(name)];
  }

  get(name) {
    name = normalizeName(name);
    return this.has(name) ? this.map[name].value : undefined;
  }

  has(name) {
    return this.map.hasOwnProperty(normalizeName(name));
  }

  set(name, value) {
    const normalizedName = normalizeName(name);
    this.map[normalizedName] = {
      value: normalizeValue(value),
      name: name
    };
  }

  forEach(callback, thisArg) {
    for (let name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name].value, this.map[name].name, this);
      }
    }
  }

  toString() {
    const result = [];
    this.forEach((value, name) => {
      let tmp = name + ': ';
      if (value) {
        tmp += value;
      }
      result.push(tmp);
    });
    return result.join('\n');
  }

  * keys() {
    for (let name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        yield this.map[name].name;
      }
    }
  }

  * values() {
    for (let name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        yield this.map[name].value;
      }
    }
  }

  * entries() {
    for (let name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        yield [this.map[name].name, this.map[name].value];
      }
    }
  }

  * [Symbol.iterator]() {
    for (let name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        yield [this.map[name].name, this.map[name].value];
      }
    }
  }
}

module.exports.ArcHeaders = ArcHeaders;
