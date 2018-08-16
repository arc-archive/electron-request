/**
 * @license
 * Copyright 2017 The Advanced REST client authors <arc@mulesoft.com>
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
const net = require('net');
const tls = require('tls');
const url = require('url');
const zlib = require('zlib');
const EventEmitter = require('events');
const log = require('electron-log');
const {ArcHeaders} = require('./arc-headers');
const {HttpErrorCodes} = require('./error-codes');
const nlBuffer = Buffer.from([13, 10]);
const nlNlBuffer = Buffer.from([13, 10, 13, 10]);
const {Cookies} = require('@advanced-rest-client/cookie-parser');
/**
 * Transport library for Advanced REST Client for node via Electron app.
 */
class SocketRequest extends EventEmitter {
  /**
   * Constructs the request from ARC's request object
   *
   * @param {Object} request ARC's request object
   * @param {Object} opts Optional. Request configuration options
   * - `timeout` {Number} Request timeout. Default to 0 (no timeout)
   * - `followRedirects` {Boolean} Fllow request redirects. Default `true`.
   * - `hosts` {Array} List of host rules to apply to the connection. Each
   * rule must contain `from` and `to` properties to be applied.
   */
  constructor(request, opts) {
    super();
    opts = opts || {};
    this.arcRequest = Object.assign({}, request);
    this.aborted = false;
    this.stats = {};
    this.state = 0;
    this.socket = undefined;
    this._timeout = opts.timeout || 0;
    this.followRedirects = opts.followRedirects === undefined ?
      true : opts.followRedirects;
    this.hosts = opts.hosts;
    this.uri = request.url;
    /**
     * Host header can be different than registered URL because of
     * `hosts` rules.
     * If a rule changes host value of the URL the original URL's host value
     * is used when generating the request and not overriden one.
     * This way virual hosts can be tested using hosts.
     *
     * @type {String}
     */
    this.hostHeader = this._getHostHeader(request.url);
    this._hostTestReg = /^\s*host\s*:/im;
  }
  /**
   * Sets the `uri` value from an URL.
   * @param {String} value
   */
  set uri(value) {
    value = this.applyHosts(value);
    this.__uri = url.parse(value);
  }
  /**
   * @return {Object} Parsed value of the request URL.
   */
  get uri() {
    return this.__uri;
  }
  /**
   * @return {Number} Set timeout value.
   */
  get timeout() {
    return this._timeout;
  }

  /**
   * Status indicating thet expecting a ststus message.
   *
   * @default 0
   */
  static get STATUS() {
    return 0;
  }
  /**
   * Status indicating thet expecting headers.
   *
   * @default 1
   */
  static get HEADERS() {
    return 1;
  }
  /**
   * Status indicating thet expecting a body message.
   *
   * @default 2
   */
  static get BODY() {
    return 2;
  }
  /**
   * Status indicating thet the message has been read and
   * connection is closing or closed.
   *
   * @default 0
   */
  static get DONE() {
    return 3;
  }
  /**
   * Cleans the state after finished.
   */
  _cleanUp() {
    this.redirects = undefined;
    this._response = undefined;
    this.stats = {};
    this.state = SocketRequest.STATUS;
    this._rawBody = undefined;
    this._rawHeaders = undefined;
    this.abort();
    this.aborted = false;
  }
  /**
   * Cleans up the state for redirect.
   */
  _cleanUpRedirect() {
    this._response = undefined;
    this.stats = {};
    this.state = SocketRequest.STATUS;
    this._rawBody = undefined;
    this._rawHeaders = undefined;
  }
  /**
   * Sends the request.
   *
   * @return {Promise}
   */
  send() {
    this.abort();
    this.aborted = false;
    return this.connect()
    .then(() => this.prepareMessage())
    .then((message) => this.writeMessage(message))
    .catch((cause) => {
      this.abort();
      throw cause;
    });
  }
  /**
   * Aborts current request.
   * It emitts `error` event
   */
  abort() {
    this.aborted = true;
    if (!this.socket) {
      return;
    }
    if (this.socket.destroyed) {
      this.socket = undefined;
      return;
    }
    this.socket.pause();
    this.socket.destroy();
  }

  /**
   * Prepares a HTTP message from ARC's request object.
   *
   * @return {Promise} Resolved promise to an `ArrayBuffer`.
   */
  prepareMessage() {
    let payload = this.arcRequest.payload;
    if (['get', 'head'].indexOf(this.arcRequest.method.toLowerCase()) !== -1) {
      payload = undefined;
    }
    return this._payloadMessage(payload)
    .then((buffer) => {
      this._addContentLength(buffer);
      this._handleAuthorization(buffer);
      return this._prepareMessage(buffer);
    })
    .then((message) => {
      if (this.auth) {
        if (this.auth.headers) {
          this.arcRequest.headers = this.auth.headers;
          delete this.auth.headers;
        }
      }
      return message;
    });
  }
  /**
   * Sends a data to a socket.
   *
   * @param {Buffer} buffer HTTP message to send
   * @return {Promise}
   */
  writeMessage(buffer) {
    // const buffer = Buffer.from(message);
    this.arcRequest.sentHttpMessage = buffer;
    this.stats.messageSendStart = performance.now();
    return new Promise((resolve) => {
      this.socket.write(buffer, () => {
        this.stats.waitingStart = performance.now();
        this.stats.send = this.stats.waitingStart - this.stats.messageSendStart;
        this.emit('loadstart');
        resolve();
      });
    });
  }
  /**
   * Connects to a server and sends the message.
   *
   * @return {Promise} Promise resolved when socket is connected.
   */
  connect() {
    const port = this._getPort(this.uri.port, this.uri.protocol);
    const host = this.uri.hostname;
    let promise;
    if (port === 443 || this.uri.protocol === 'https:') {
      promise = this._connectTls(port, host);
    } else {
      promise = this._connect(port, host);
    }
    return promise
    .then((socket) => {
      if (this.timeout && this.timeout > 0) {
        socket.setTimeout(this.timeout);
      }
      this.socket = socket;
      this._addSocketListeners(socket);
      socket.resume();
      return socket;
    });
  }
  /**
   * Connects to a server and writtes a message using insecured connection.
   *
   * @param {Number} port A port number to connect to.
   * @param {String} host A host name to connect to
   * @return {Promise} A promise resolved when the message was sent to a server
   */
  _connect(port, host) {
    return new Promise((resolve, reject) => {
      const connectionStart = performance.now();
      let afterLookup;
      const client = net.createConnection(port, host, {}, () => {
        this.stats.connect = performance.now() - afterLookup;
        resolve(client);
      });
      client.pause();
      client.once('lookup', () => {
        afterLookup = performance.now();
        this.stats.dns = afterLookup - connectionStart;
      });
      client.once('error', function(err) {
        reject(err);
      });
    });
  }
  /**
   * Connects to a server and writtes a message using secured connection.
   *
   * @param {Number} port A port number to connect to.
   * @param {String} host A host name to connect to
   * @return {Promise} A promise resolved when the message was sent to a server
   */
  _connectTls(port, host) {
    const options = {
      rejectUnauthorized: false,
      requestCert: false,
      requestOCSP: false,
      checkServerIdentity: function() {},
      servername: host,
    };
    return new Promise((resolve, reject) => {
      const connectionStart = performance.now();
      let secureStart = -1;
      let afterLookup;
      const client = tls.connect(port, host, options, () => {
        secureStart = performance.now();
        this.stats.connect = performance.now() - afterLookup;
        resolve(client);
      });
      client.pause();
      client.once('error', function(e) {
        reject(e);
      });
      client.once('lookup', () => {
        afterLookup = performance.now();
        this.stats.dns = afterLookup - connectionStart;
      });
      client.once('secureConnect', () => {
        this.stats.ssl = secureStart > -1 ?
          performance.now() - secureStart : -1;
      });
    });
  }

  /**
   * Prepares a full HTTP message body
   *
   * @param {?Buffer} buffer Optional, body `Buffer`
   * @return {Buffer} `Buffer` of a HTTP message
   */
  _prepareMessage(buffer) {
    const headers = [];
    const search = this.uri.search;
    const hash = this.uri.hash;
    let path = this.uri.pathname;
    if (search) {
      path += search;
    }
    if (hash && path !== '#') {
      path += hash;
    }
    headers.push(this.arcRequest.method + ' ' + path + ' HTTP/1.1');
    if (this._hostRequired()) {
      headers.push('Host: ' + this.hostHeader);
    }
    let str = headers.join('\r\n');
    if (this.arcRequest.headers) {
      str += '\r\n';
      str += this._normalizeString(this.arcRequest.headers);
    }
    const startbuffer = Buffer.from(str, 'utf8');
    const endBuffer = Buffer.from(new Uint8Array([13, 10, 13, 10]));
    let body;
    let sum = startbuffer.length + endBuffer.length;
    if (buffer) {
      sum += buffer.length;
      body = Buffer.concat([startbuffer, endBuffer, buffer], sum);
    } else {
      body = Buffer.concat([startbuffer, endBuffer], sum);
    }
    return body;
  }
  /**
   * Tests if current connection is required to add `host` header.
   * It returns `false` only if `host` header has been already provided.
   *
   * @return {Boolean} True when the `host` header should be added to the
   * headers list.
   */
  _hostRequired() {
    const headers = this.arcRequest.headers;
    if (typeof headers !== 'string') {
      return true;
    }
    return !this._hostTestReg.test(headers);
  }
  /**
   * Reads a port number for a connection.
   *
   * @param {?Number} port Existing information abour port.
   * @param {?String} protocol Request protocol. Only used if `port` is not set.
   * @return {Number} A port number. Default to 80.
   */
  _getPort(port, protocol) {
    if (port) {
      port = Number(port);
      if (port === port) {
        return port;
      }
    }
    if (protocol === 'https:') {
      return 443;
    }
    return 80;
  }
  /**
   * Tranforms a payload message into `Buffer`
   *
   * @param {String|Blob|ArrayBuffer|FormData} payload A payload message
   * @return {Promise} A promise resolved to a `Buffer`.
   */
  _payloadMessage(payload) {
    if (!payload) {
      return Promise.resolve();
    }
    if (typeof payload === 'string') {
      payload = this._normalizeString(payload);
      return Promise.resolve(Buffer.from(payload, 'utf8'));
    }
    if (payload instanceof ArrayBuffer) {
      return Promise.resolve(Buffer.from(payload));
    }
    if (payload instanceof Buffer) {
      return Promise.resolve(payload);
    }
    if (payload instanceof FormData) {
      let _conventer = require('./form-data');
      return _conventer(payload)
      .then((result) => {
        const h = new ArcHeaders(this.arcRequest.headers);
        h.set('Content-Type', result.type);
        this.arcRequest.headers = h.toString();
        return result.buffer;
      });
    }
    if (payload instanceof Blob) {
      return this._blob2buffer(payload);
    }
    return Promise.reject(new Error('Unsupported payload message'));
  }
  /**
   * Alters authorization header depending on the `auth` object
   */
  _handleAuthorization() {
    const auth = this.arcRequest.auth;
    if (!auth) {
      return;
    }
    switch (auth.method) {
      case 'ntlm':
        this._authorizeNtlm(auth);
        return;
    }
  }
  /**
   * Authorize the request with NTLM
   * @param {Object} authData Credentials to use
   */
  _authorizeNtlm(authData) {
    const {NtlmAuth} = require('./ntlm');
    authData.url = this.arcRequest.url;
    const auth = new NtlmAuth(authData);
    if (!this.auth) {
      this.auth = {
        method: 'ntlm',
        state: 0,
        headers: this.arcRequest.headers
      };
      const msg = auth.createMessage1(this.uri.host);
      const h = new ArcHeaders(this.arcRequest.headers);
      h.set('Authorization', 'NTLM ' + msg.toBase64());
      this.arcRequest.headers = h.toString();
      log.info('New auth headers: ', this.arcRequest.headers);
    } else if (this.auth && this.auth.state === 1) {
      const msg = auth.createMessage3(this.auth.challengeHeader, this.uri.host);
      this.auth.state = 2;
      const h = new ArcHeaders(this.arcRequest.headers);
      h.set('Authorization', 'NTLM ' + msg.toBase64());
      this.arcRequest.headers = h.toString();
    }
  }
  /**
   * Transfers blob to `ArrayBuffer`.
   *
   * @param {Blob} blob A blob object to transform
   * @return {Promise} A promise resolved to a `Buffer`
   */
  _blob2buffer(blob) {
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
   * TODO: Check if using Uint8Array is faster.
   *
   * @param {String} string A string to be normalized.
   * @return {String} normalized string
   */
  _normalizeString(string) {
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
   * Adds the `content-length` header to current request headers list if
   * it's required.
   * This function will do nothing if the request do not carry a payload or
   * when the content length header is already set.
   *
   * @param {ArrayBuffer} buffer Generated message buffer.
   */
  _addContentLength(buffer) {
    if (this.arcRequest.method === 'GET') {
      return;
    }
    const size = buffer ? buffer.length : 0;
    const headers = new ArcHeaders(this.arcRequest.headers);
    headers.set('content-length', size);
    this.arcRequest.headers = headers.toString();
  }

  /**
   * Convert ArrayBuffer to readable form
   * @param {ArrayBuffer} buff
   * @return {String} Converted string
   */
  arrayBufferToString(buff) {
    if (this.aborted) {
      return '';
    }
    if (buff instanceof Buffer) {
      return buff.toString();
    }
    if (!!buff.buffer) {
      // Not a ArrayBuffer, need and instance of AB
      // It can't just get buff.buffer because it will use original buffer if
      // the buff is a slice of it.
      let b = buff.slice(0);
      buff = b.buffer;
    }
    buff = Buffer.from(buff);
    return buff.toString();
  }
  /**
   * Convert a string to an ArrayBuffer.
   * @param {string} string The string to convert.
   * @return {Buffer} An array buffer whose bytes correspond to the string.
   */
  stringToArrayBuffer(string) {
    if (this.aborted) {
      return new ArrayBuffer();
    }
    return Buffer.from(string, 'utf8');
  }
  /**
   * Add event listeners to existing socket.
   * @param {net.Socket} socket An instance of the socket.
   * @return {net.Socket} The same socket. Used for chaining.
   */
  _addSocketListeners(socket) {
    let received = false;
    socket.on('data', (data) => {
      if (!received) {
        let now = performance.now();
        this.stats.firstReceived = now;
        this.stats.wait = now - this.stats.waitingStart;
        this.emit('firstbyte');
        received = true;
      }
      data = Buffer.from(data);
      try {
        this._processSocketMessage(data);
      } catch (e) {
        this._errorRequest({
          message: e.message || 'Unknown error occurred'
        });
        return;
      }
    });
    socket.on('timeout', () => {
      this.state = SocketRequest.DONE;
      this._errorRequest(new Error('Connection timeout.'));
    });
    socket.on('end', () => {
      this.stats.lastReceived = performance.now();
      this.stats.receive = this.stats.lastReceived - this.stats.firstReceived;
      if (this.state !== SocketRequest.DONE) {
        if (!this._response) {
          // The parser havn't found the end of message so there was no message!
          this._errorRequest(
            new Error('Connection closed without sending a data'));
        } else {
          // There is an issue with the response. Size missmatch? Anyway,
          // it tries to create a response from current data.
          this.emit('loadend');
          this._publishResponse({
            includeRedirects: true
          });
        }
      }
    });
    socket.on('error', (err) => {
      this._errorRequest(err);
    });
    return socket;
  }
  /**
   * Processes response message chunk
   * @param {Buffer} buffer Message buffer
   */
  _processResponse(buffer) {
    this._processSocketMessage(buffer);
    this._reportResponse();
  }
  /**
   * Reports response after processing it.
   */
  _reportResponse() {
    if (this.aborted) {
      return;
    }
    this.stats.lastReceived = performance.now();
    this.stats.receive = this.stats.lastReceived - this.stats.firstReceived;
    const status = this._response.status;
    if (status >= 300 && status < 400) {
      if (this.followRedirects && this._reportRedirect(status)) {
        return;
      }
    } else if (status === 401 && this.auth) {
      switch (this.auth.method) {
        case 'ntlm':
          this.handleNtlmResponse();
          return;
      }
    }
    this.emit('loadend');
    this._publishResponse({
      includeRedirects: true
    });
  }
  /**
   * Handles the response with NTLM authorization
   */
  handleNtlmResponse() {
    if (this.auth.state === 0) {
      if (this._response._headers.has('www-authenticate')) {
        this.auth.state = 1;
        this.auth.challengeHeader =
          this._response._headers.get('www-authenticate');
        this._cleanUpRedirect();
        this.prepareMessage()
        .then((message) => this.writeMessage(message));
        return;
      }
    }
    delete this.auth;
    this.emit('loadend');
    this._publishResponse({
      includeRedirects: true
    });
  }
  /**
   * Reports response when redirected.
   * @param {Number} status Received status code
   * @return {Boolean} True if the request has been redirected.
   */
  _reportRedirect(status) {
    // https://github.com/jarrodek/socket-fetch/issues/13
    let redirect = false;
    const redirectOptions = {};
    switch (status) {
      case 300:
      case 304:
      case 305:
        // do nothing;
        break;
      case 301:
      case 302:
      case 307:
        if (['GET', 'HEAD'].indexOf(this.arcRequest.method) !== -1) {
          redirect = true;
        }
        break;
      case 303:
        redirect = true;
        redirectOptions.forceGet = true;
        break;
    }
    if (!redirect) {
      return false;
    }
    const locationHeader = 'location';
    if (!this._response._headers.has(locationHeader)) {
      return false;
    }
    redirectOptions.location = this._response._headers.get(locationHeader);
    process.nextTick(() => {
      this._redirectRequest(redirectOptions);
    });
    return true;
  }

  /**
   * Creates a response and adds it to the redirects list and redirects
   * the request to the new location.
   *
   * @param {Object} options A redirection options:
   * forceGet {Boolean} - If true the redirected request will be GET request
   * location {String} - location of the resource (redirect uri)
   */
  _redirectRequest(options) {
    let location = options.location;
    // https://github.com/jarrodek/socket-fetch/issues/5
    try {
      let u = new URL(location);
      let protocol = u.protocol;
      if (protocol === '') {
        let path = u.pathname;
        if (path && path[0] !== '/') {
          path = '/' + path;
        }
      }
    } catch (e) {
      // It must be relative location
      let origin = this.uri.protocol + '//';
      origin += this.uri.host;
      if (origin[origin.length - 1] === '/') {
        origin = origin.substr(0, origin.length - 1);
      }
      if (location[0] !== '/') {
        location = origin + this.uri.pathname + location;
      } else {
        location = origin + location;
      }
    }

    // check if this is infinite loop
    if (this.redirects) {
      let index = -1;
      let i = 0;
      for (let item of this.redirects) {
        if (item.requestUrl === location) {
          index = i;
          break;
        }
        i++;
      }
      if (index !== -1) {
        this._errorRequest({
          code: 310
        });
        return;
      }
    }
    const detail = {
      location: location,
      returnValue: true
    };
    this.emit('beforeredirect', detail);
    if (!detail.returnValue) {
      this._publishResponse({
        includeRedirects: true
      });
      return;
    }
    if (!this.redirects) {
      this.redirects = new Set();
    }
    let responseCookies;
    if (this._response._headers.has('set-cookie')) {
      responseCookies = this._response._headers.get('set-cookie');
    }
    this._createResponse({
      includeRedirects: false
    })
    .then((response) => {
      response.requestUrl = this.arcRequest.url;
      response.sentHttpMessage = this.arcRequest.sentHttpMessage;
      this.redirects.add(response);
      return this._cleanUpRedirect({
        keepConnection: false
      });
    })
    .then(() => {
      if (!responseCookies) {
        return;
      }
      this._processRedirectCookies(responseCookies, location);
    })
    .then(() => {
      this.arcRequest.url = location;
      if (options.forceGet) {
        this.arcRequest.method = 'GET';
      }
      this.uri = location;
      this.hostHeader = this._getHostHeader(location);
      // No idea why but without setTimeout the program loses it's
      // scope after calling the function.
      window.setTimeout(() => {
        this.send();
      }, 0);
    })
    .catch((e) => {
      this._errorRequest({
        'message': e && e.message || 'Unknown error occurred'
      });
    });
  }

  /**
   * Process received message.
   *
   * @param {ArrayBuffer} data Received message.
   */
  _processSocketMessage(data) {
    if (this.aborted) {
      return;
    }
    if (this.state === SocketRequest.DONE) {
      return;
    }
    if (this.state === SocketRequest.STATUS) {
      data = this._processStatus(data);
      if (!data) {
        return;
      }
    }
    if (this.state === SocketRequest.HEADERS) {
      data = this._processHeaders(data);
      if (!data) {
        return;
      }
    }
    if (this.state === SocketRequest.BODY) {
      this._processBody(data);
      return;
    }
  }

  /**
   * Read status line from the response.
   * This function will set `status` and `statusMessage` fields
   * and then will set `state` to HEADERS.
   *
   * @param {Buffer} data Received data
   * @return {Buffer}
   */
  _processStatus(data) {
    if (this.aborted) {
      return;
    }
    this._response = {
      status: 0,
      statusMessage: ''
    };

    if (!data) {
      return;
    }

    log.info('Processing status');
    const index = data.indexOf(nlBuffer);
    let statusLine = data.slice(0, index).toString();
    data = data.slice(index + 2);
    statusLine = statusLine.replace(/HTTP\/\d(\.\d)?\s/, '');
    const delimPos = statusLine.indexOf(' ');
    let status;
    let msg = '';
    if (delimPos === -1) {
      status = statusLine;
    } else {
      status = statusLine.substr(0, delimPos);
      msg = statusLine.substr(delimPos + 1);
    }
    status = Number(status);
    if (status !== status) {
      status = 0;
    }
    if (msg && msg.indexOf('\n') !== -1) {
      msg = msg.split('\n')[0];
    }
    this._response.status = status;
    this._response.statusMessage = msg;
    log.info('Received status',
      this._response.status,
      this._response.statusMessage);
    this.state = SocketRequest.HEADERS;
    return data;
  }

  /**
   * Read headers from the received data.
   *
   * @param {Buffer} data Received data
   * @return {Buffer} Remaining data in the buffer.
   */
  _processHeaders(data) {
    if (this.aborted) {
      return;
    }
    if (!data) {
      this._parseHeaders();
      return;
    }
    log.info('Processing headers');
    // Looking for end of headers section
    let index = data.indexOf(nlNlBuffer);
    let padding = 4;
    if (index === -1) {
      // It can also be 2x ASCII 10
      let _index = data.indexOf(Buffer.from([10, 10]));
      if (_index !== -1) {
        index = _index;
        padding = 2;
      }
    }

    // https://github.com/jarrodek/socket-fetch/issues/3
    const enterIndex = data.indexOf(nlBuffer);
    if (index === -1 && enterIndex !== 0) {
      // end in next chunk
      if (!this._rawHeaders) {
        this._rawHeaders = data;
      } else {
        let sum = this._rawHeaders.length + data.length;
        this._rawHeaders = Buffer.concat([this._rawHeaders, data], sum);
      }
      return;
    }
    if (enterIndex !== 0) {
      let headersArray = data.slice(0, index);
      if (!this._rawHeaders) {
        this._rawHeaders = headersArray;
      } else {
        let sum = this._rawHeaders.length + headersArray.length;
        this._rawHeaders = Buffer.concat([this._rawHeaders, headersArray], sum);
      }
    }
    this._parseHeaders(this._rawHeaders);
    delete this._rawHeaders;
    this.state = SocketRequest.BODY;
    const start = index === -1 ? 0 : index;
    const move = (enterIndex === 0) ? 2 : padding;
    data = data.slice(start + move);
    return this._postHeaders(data);
  }
  /**
   * Check the response headers and end the request if nescesary.
   * @param {Buffer} data Current response data buffer
   * @return {Buffer}
   */
  _postHeaders(data) {
    if (this.arcRequest.method === 'HEAD') {
      this._reportResponse();
      return;
    }
    if (data.length === 0) {
      if (this._response._headers.has('Content-Length')) {
        // If the server do not close the connection and clearly indicate that
        // there are no further data to receive the app can close the connection
        // and prepare the response.
        let length = Number(this._response._headers.get('Content-Length'));
        // NaN never equals NaN. This is faster.
        if (length === length && length === 0) {
          this._reportResponse();
          return;
        }
      } else if (!this._response._headers.has('Transfer-Encoding') ||
        !this._response._headers.get('Transfer-Encoding')) {
        // Fix for https://github.com/jarrodek/socket-fetch/issues/6
        // There is no body in the response.
        this._reportResponse();
        return;
      }
      return;
    }
    return data;
  }
  /**
   * This function assumes that all headers has been read and it's
   * just before changing the ststaus to BODY.
   *
   * @param {Buffer} array
   */
  _parseHeaders(array) {
    let raw = '';
    if (array) {
      raw = array.toString();
    }
    this._response.headers = raw;
    log.info('Received headers list', raw);
    const headers = new ArcHeaders(raw);
    this._response._headers = headers;
    if (headers.has('Content-Length')) {
      this._contentLength = Number(headers.get('Content-Length'));
    }
    if (headers.has('Transfer-Encoding')) {
      let tr = headers.get('Transfer-Encoding');
      if (tr === 'chunked') {
        this._chunked = true;
      }
    }
    const detail = {
      returnValue: true,
      value: headers
    };
    this.emit('headersreceived', detail);
    if (!detail.returnValue) {
      this.abort();
      return;
    }
  }
  /**
   * Sets the `_rawBody` property.
   *
   * @param {Buffer} data A data to process
   */
  _processBody(data) {
    if (this.aborted) {
      return;
    }
    if (this._chunked) {
      this._processBodyChunked(data);
      return;
    }

    if (!this._rawBody) {
      this._rawBody = data;
      if (this._rawBody.length >= this._contentLength) {
        this._reportResponse();
        return;
      }
      return;
    }
    let sum = this._rawBody.length + data.length;
    this._rawBody = Buffer.concat([this._rawBody, data], sum);
    if (this._rawBody.length >= this._contentLength) {
      this._reportResponse();
      return;
    }
  }
  /**
   * Sets the `_rawBody` property for a chunked response.
   *
   * @param {Buffer} data A latest data to process
   */
  _processBodyChunked(data) {
    if (this.__bodyChunk) {
      data = Buffer.concat([
        this.__bodyChunk, data], this.__bodyChunk.length + data.length);
      this.__bodyChunk = undefined;
    }
    while (true) {
      if (this._chunkSize === 0 && data.indexOf(nlNlBuffer) === 0) {
        this._reportResponse();
        return;
      }
      if (!this._chunkSize) {
        data = this.readChunkSize(data);
        if (!this._chunkSize && this._chunkSize !== 0) {
          // It may happen that node's buffer cuts the data
          // just before the chunk size.
          // It should proceed it in next portion of the data.
          return;
        }
        if (!this._chunkSize) {
          this._reportResponse();
          return;
        }
      }
      let size = Math.min(this._chunkSize, data.length);
      let sliced = data.slice(0, size);
      if (!this._rawBody) {
        this._rawBody = sliced;
      } else {
        let sum = size + this._rawBody.length;
        this._rawBody = Buffer.concat([this._rawBody, sliced], sum);
      }

      this._chunkSize -= size;
      if (data.length === 0) {
        // log.warn('Next chunk will start with CRLF!');
        return;
      }
      data = data.slice(size + 2); // + CR
      if (data.length === 0) {
        // log.info('No more data here. Waiting for new chunk');
        return;
      }
    }
  }
  /**
   * If response's Transfer-Encoding is 'chunked' read until next CR.
   * Everything before it is a chunk size.
   *
   * @param {Buffer} array
   * @return {Buffer}
   */
  readChunkSize(array) {
    if (this.aborted) {
      return;
    }
    let index = array.indexOf(nlBuffer);
    if (index === -1) {
      // not found in this portion of data.
      return array;
    }
    if (index === 0) {
      // Node's buffer cuts CRLF after the end of chunk data, without last CLCR,
      // here's to fix it.
      // It can be either new line from the last chunk or end of
      // the message where
      // the rest of the array is [13, 10, 48, 13, 10, 13, 10]
      if (array.indexOf(nlNlBuffer) === 0) {
        this._chunkSize = 0;
        return Buffer.alloc(0);
      } else {
        array = array.slice(index + 2);
        index = array.indexOf(nlBuffer);
      }
    }
    // log.info('Size index: ', index);
    const chunkSize = parseInt(array.slice(0, index).toString(), 16);
    if (chunkSize !== chunkSize) {
      this._chunkSize = undefined;
      return array.slice(index + 2);
    }
    this._chunkSize = chunkSize;
    return array.slice(index + 2);
  }
  /**
   * Parse headers string and receive an object.
   *
   * @param {String} str A headers string as defined in the spec
   * @return {Object} And object of key-value pairs where key is a
   */
  headersToObject(str) {
    if (this.aborted) {
      return {};
    }
    if (!str || typeof str !== 'string' || str.trim() === '') {
      return {};
    }
    const result = {};
    const headers = str.split(/\n(?=[^ \t]+)/gm);

    for (let i = 0, len = headers.length; i < len; i++) {
      let line = headers[i].trim();
      if (line === '') {
        continue;
      }
      let pos = line.indexOf(':');
      if (pos === -1) {
        result[line] = '';
        continue;
      }
      let name = line.substr(0, pos);
      let value = line.substr(pos + 1).trim();
      if (name in result) {
        result[name] += '; ' + value;
      } else {
        result[name] = value;
      }
    }
    return result;
  }

  /**
   * Create a `Response` object.
   *
   * The expected response object has the following properties:
   * - isError: {Boolean}
   * - error: {Object}
   * - isXhr: {Boolean}
   * - loadingTime: {Number}
   * - request: {Object} - The original request object
   * - response: {Object}
   *  - status {Number}
   *  - statusText: {String}
   *  - headers: {String}
   *  - payload: {String|Buffer}
   * - redirects: {Array<Object>} - List of response objects
   * - redirectsTiming: {Array<Object>} - List of timings for redirects in order
   * - timing: {Object} - HAR 1.2 timing object
   * - sentHttpMessage: {String} - The message sent to the server.
   *
   * @param {Object} opts An options to construct a response object:
   *  - {Boolean} includeRedirects If true the response will have
   *    information about redirects.
   *  - {Error} error An error object when the response is errored.
   * @return {Response} A response object.
   */
  _createResponse(opts) {
    opts = opts || {};
    if (opts.error) {
      const resp = {
        isError: true,
        error: new Error(opts.error.message || opts.error),
        sentHttpMessage: this.arcRequest.sentHttpMessage,
        stats: this.stats
      };
      if (opts.includeRedirects && this.redirects && this.redirects.size) {
        resp.redirects = Array.from(this.redirects);
      }
      return Promise.resolve(resp);
    }
    if (this.aborted) {
      return Promise.resolve();
    }
    const status = this._response.status;
    if (status < 100 || status > 599) {
      return Promise.reject(
        new Error(`The response status "${status}" is not allowed.
      See HTTP spec for more details: https://tools.ietf.org/html/rfc2616#section-6.1.1`));
    } else if (status === undefined) {
      return Promise.reject(
        new Error(`The response status is empty.
      It means that the successful connection wasn't made.
      Check your request parameters.`));
    }
    return this._decompress()
    .then((body) => {
      const response = {
        status: status,
        statusText: this._response.statusMessage,
        headers: this._response.headers,
        url: this.arcRequest.url,
        payload: body,
        stats: this.stats
      };
      if (opts.includeRedirects && this.redirects && this.redirects.size) {
        response.redirects = Array.from(this.redirects);
      }
      if (status === 401) {
        response.auth = this._getAuth();
      }
      return response;
    });
  }
  /**
   * Generates authorization info object from response.
   *
   * @return {Object}
   */
  _getAuth() {
    if (this.auth) {
      return this.auth;
    }
    let auth = this._response._headers.has('www-authenticate') ?
      this._response._headers.get('www-authenticate') : undefined;
    const result = {
      method: 'unknown'
    };
    if (auth) {
      auth = auth.toLowerCase();
      if (auth.indexOf('ntlm') !== -1) {
        result.method = 'ntlm';
      } else if (auth.indexOf('basic') !== -1) {
        result.method = 'basic';
      } else if (auth.indexOf('digest') !== -1) {
        result.method = 'digest';
      }
    }
    return result;
  }
  /**
   * Decompresses received body if `content-encoding` header is set.
   *
   * @return {Promise} Promise resilved to parsed body
   */
  _decompress() {
    if (this.aborted) {
      return Promise.resolve();
    }
    const body = this._rawBody;
    if (!body) {
      return Promise.resolve();
    }
    const ceHeader = 'content-encoding';
    if (!this._response._headers.has(ceHeader)) {
      return Promise.resolve(body);
    }
    const ce = this._response._headers.get(ceHeader);
    if (ce.indexOf('deflate') !== -1) {
      return this._inflate(body);
    }
    if (ce.indexOf('gzip') !== -1) {
      return this._gunzip(body);
    }
    return Promise.resolve(body);
  }
  /**
   * Decompress body with Inflate.
   * @param {Buffer} body Received response payload
   * @return {Promise} Promise resolved to decompressed buffer.
   */
  _inflate(body) {
    body = Buffer.from(body);
    return new Promise((resolve, reject) => {
      zlib.inflate(body, (err, buffer) => {
        if (err) {
          reject(new Error(err.message || err));
        } else {
          resolve(buffer);
        }
      });
    });
  }
  /**
   * Decompress body with ZLib.
   * @param {Buffer} body Received response payload
   * @return {Promise} Promise resolved to decompressed buffer.
   */
  _gunzip(body) {
    body = Buffer.from(body);
    return new Promise((resolve, reject) => {
      zlib.gunzip(body, (err, buffer) => {
        if (err) {
          reject(new Error(err.message || err));
        } else {
          resolve(buffer);
        }
      });
    });
  }

  /**
   * Generate response object and publish it to the listeners.
   *
   * @param {Object} opts See #_createResponse for more info.
   * @return {Promise}
   */
  _publishResponse(opts) {
    this.state = SocketRequest.DONE;
    return this._createResponse(opts)
    .then((response) => {
      this.emit('load', response, this.arcRequest);
      this._cleanUp();
      this.abort();
    })
    .catch((e) => {
      this._errorRequest({
        'message': e && e.message || 'Unknown error occurred'
      });
    });
  }
  /**
   * Handles cookie exchange when redirecting the request.
   * @param {String} responseCookies Cookies received in the resposne
   * @param {String} location Redirect destination
   */
  _processRedirectCookies(responseCookies, location) {
    let newParser = new Cookies(responseCookies, location);
    newParser.filter();
    const expired = newParser.clearExpired();
    const headers = new ArcHeaders(this.arcRequest.headers);
    const hasCookie = headers.has('cookie');
    if (hasCookie) {
      const oldCookies = headers.get('cookie');
      const oldParser = new Cookies(oldCookies, location);
      oldParser.filter();
      oldParser.clearExpired();
      oldParser.merge(newParser);
      newParser = oldParser;
      // remove expired from the new response.
      newParser.cookies = newParser.cookies.filter((c) => {
        for (let i = 0, len = expired.length; i < len; i++) {
          if (expired[i].name === c.name) {
            return false;
          }
        }
        return true;
      });
    }
    const str = newParser.toString(true);
    if (str) {
      headers.set('cookie', str);
    } else if (hasCookie) {
      headers.delete('cookie');
    }
    this.arcRequest.headers = headers.toString();
  }

  /**
   * Finishes the response with error message.
   * @param {Object} opts `code` and `message`
   */
  _errorRequest(opts) {
    this.aborted = true;
    let message;
    if (opts.code && !opts.message) {
      message = HttpErrorCodes.getCodeMessage(opts.code);
    } else if (opts.message) {
      message = opts.message;
    }
    message = message || 'Unknown error occurred';
    const error = new Error(message);
    this.emit('error', error);
    this._cleanUp();
  }
  /**
   * Applies `hosts` rules to an URL.
   *
   * @param {String} value An URL to apply the rules to
   * @return {String} Evaluated URL with hosts rules.
   */
  applyHosts(value) {
    const rules = this.hosts;
    if (!rules || !rules.length) {
      return value;
    }
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const result = this._evaluateRule(value, rule);
      if (result) {
        return result;
      }
    }
    return value;
  }
  /**
   * Evaluates hosts rule and applies it to the `url`.
   * @param {String} url The URL to evaluate
   * @param {Object} rule ARC rule definition
   * @return {String} Processed url.
   */
  _evaluateRule(url, rule) {
    if (!rule.from || !rule.to) {
      return;
    }
    const re = this._createRuleRe(rule.from);
    if (!re.test(url)) {
      return;
    }
    return url.replace(re, rule.to);
  }
  /**
   * @param {String} input Rule body
   * @return {RegExp} Regular expression for the rule.
   */
  _createRuleRe(input) {
    input = input.replace(/\*/g, '(.*)');
    return new RegExp(input, 'gi');
  }
  /**
   * Creates a value for host header.
   *
   * @param {String} value An url to get the information from.
   * @return {String} Value of the host header
   */
  _getHostHeader(value) {
    const uri = url.parse(value);
    let hostValue = uri.hostname;
    const defaultPorts = [80, 443];
    const port = this._getPort(uri.port, uri.protocol);
    if (defaultPorts.indexOf(port) === -1) {
      hostValue += ':' + port;
    }
    return hostValue;
  }
}
exports.SocketRequest = SocketRequest;
