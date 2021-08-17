/**
 * @license
 * Copyright 2018 The Advanced REST client authors <arc@mulesoft.com>
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
import net from 'net';
import tls from 'tls';
import { ArcHeaders } from '@advanced-rest-client/arc-headers/src/ArcHeaders.js';
import { RequestUtils } from './RequestUtils.js';
import { PayloadSupport } from './PayloadSupport.js';
import { BaseRequest } from './BaseRequest.js';
import { NtlmAuth } from './ntlm.js';

/** @typedef {import('@advanced-rest-client/arc-types').ArcRequest.ArcBaseRequest} ArcBaseRequest */
/** @typedef {import('@advanced-rest-client/arc-types').ArcResponse.Response} ArcResponse */
/** @typedef {import('@advanced-rest-client/arc-types').Authorization.LegacyAuth} LegacyAuth */
/** @typedef {import('@advanced-rest-client/arc-types').Authorization.NtlmAuthLegacy} NtlmAuthLegacy */
/** @typedef {import('@advanced-rest-client/arc-types').Authorization.NtlmAuthorization} NtlmAuthorization */
/** @typedef {import('./RequestOptions').Options} Options */

const nlBuffer = Buffer.from([13, 10]);
const nlNlBuffer = Buffer.from([13, 10, 13, 10]);
/**
 * Transport library for Advanced REST Client for node via Electron app.
 */
export class SocketRequest extends BaseRequest {
  /**
   * Constructs the request from ARC's request object
   *
   * @param {ArcBaseRequest} request The request to send.
   * @param {string} id The id of the request, used with events and when reporting the response.
   * @param {Options=} options Optional. Request configuration options
   */
  constructor(request, id, options) {
    super(request, id, options);
    this.state = 0;
    /**
     * @type {Buffer}
     */
    this.rawHeaders = undefined;
    /**
     * @type {number}
     */
    this.chunkSize = undefined;
  }

  /**
   * Status indicating expecting a status message.
   *
   * @default 0
   */
  static get STATUS() {
    return 0;
  }

  /**
   * Status indicating expecting headers.
   *
   * @default 1
   */
  static get HEADERS() {
    return 1;
  }

  /**
   * Status indicating expecting a body message.
   *
   * @default 2
   */
  static get BODY() {
    return 2;
  }

  /**
   * Status indicating the message has been read and connection is closing or closed.
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
    super._cleanUp();
    this.state = SocketRequest.STATUS;
    this.rawHeaders = undefined;
  }

  /**
   * Cleans up the state for redirect.
   */
  _cleanUpRedirect() {
    super._cleanUpRedirect();
    this.state = SocketRequest.STATUS;
    this.rawHeaders = undefined;
  }

  /**
   * Sends the request.
   *
   * @return {Promise}
   */
  async send() {
    this.abort();
    this.aborted = false;
    try {
      await this.connect();
      const message = await this.prepareMessage();
      await this.writeMessage(message);
    } catch (cause) {
      this.abort();
      throw cause;
    }
  }

  /**
   * Prepares a HTTP message from ARC's request object.
   *
   * @return {Promise<Buffer>} Resolved promise to an `ArrayBuffer`.
   */
  async prepareMessage() {
    let payload = this.arcRequest.payload;
    if (['get', 'head'].indexOf(this.arcRequest.method.toLowerCase()) !== -1) {
      payload = undefined;
    }
    const headers = new ArcHeaders(this.arcRequest.headers);
    this._prepareHeaders(headers);
    const buffer = await PayloadSupport.payloadToBuffer(payload, headers);
    RequestUtils.addContentLength(this.arcRequest.method, buffer, headers);
    this._handleAuthorization(headers);
    this.transportRequest.headers = headers.toString();
    const message = this._prepareMessage(headers, buffer);
    if (this.auth) {
      // This restores altered by authorization original headers
      // so it can be safe to use when redirecting
      if (this.auth.headers) {
        this.arcRequest.headers = this.auth.headers;
        delete this.auth.headers;
      }
    }
    return message;
  }

  /**
   * Sends a data to a socket.
   *
   * @param {Buffer} buffer HTTP message to send
   * @return {Promise<void>}
   */
  writeMessage(buffer) {
    let msg = buffer.toString();
    const limit = this.opts.sentMessageLimit;
    if (limit && limit > 0 && msg.length >= limit) {
      msg = msg.substr(0, limit);
      msg += ' ...';
    }
    this.transportRequest.httpMessage = msg;
    const startTime = Date.now();
    this.stats.startTime = startTime;
    this.transportRequest.startTime = startTime;

    this.stats.messageStart = Date.now();
    return new Promise((resolve) => {
      this.socket.write(buffer, () => {
        this.stats.sentTime = Date.now();
        try {
          this.emit('loadstart', this.id);
        } catch (_) {
          //
        }
        resolve();
      });
    });
  }

  /**
   * Connects to a server and sends the message.
   *
   * @return {Promise<net.Socket>} Promise resolved when socket is connected.
   */
  async connect() {
    const port = RequestUtils.getPort(this.uri.port, this.uri.protocol);
    const host = this.uri.hostname;
    let socket;
    if (port === 443 || this.uri.protocol === 'https:') {
      socket = await this._connectTls(port, host);
    } else {
      socket = await this._connect(port, host);
    }
    const { timeout } = this;
    if (timeout > 0) {
      socket.setTimeout(timeout);
    }
    this.socket = socket;
    this._addSocketListeners(socket);
    socket.resume();
    return socket;
  }

  /**
   * Connects to a server and writes a message using insecure connection.
   *
   * @param {number} port A port number to connect to.
   * @param {string} host A host name to connect to
   * @return {Promise<net.Socket>} A promise resolved when the message was sent to a server
   */
  _connect(port, host) {
    return new Promise((resolve, reject) => {
      this.stats.connectionTime = Date.now();
      const client = net.createConnection(port, host, () => {
        this.stats.connectedTime = Date.now();
        resolve(client);
      });
      client.pause();
      client.once('lookup', () => {
        this.stats.lookupTime = Date.now();
      });
      client.once('error', (err) => reject(err));
    });
  }

  /**
   * Connects to a server and writes a message using secured connection.
   *
   * @param {number} port A port number to connect to.
   * @param {string} host A host name to connect to
   * @return {Promise<tls.TLSSocket>} A promise resolved when the message was sent to a server
   */
  _connectTls(port, host) {
    const options = {
      servername: host,
    };
    if (this.opts.validateCertificates) {
      options.checkServerIdentity = this._checkServerIdentity.bind(this);
    } else {
      options.rejectUnauthorized = false;
      options.requestOCSP = false;
      options.requestCert = false;
    }
    const cert = this.opts.clientCertificate;
    if (cert) {
      this._addClientCertificate(cert, options);
    }

    return new Promise((resolve, reject) => {
      this.stats.connectionTime = Date.now();
      const client = tls.connect(port, host, options, () => {
        this.stats.connectedTime = Date.now();
        this.stats.secureStartTime = Date.now();
        resolve(client);
      });
      client.pause();
      client.once('error', (e) => reject(e));
      client.once('lookup', () => {
        this.stats.lookupTime = Date.now();
      });
      client.once('secureConnect', () => {
        this.stats.secureConnectedTime = Date.now();
      });
    });
  }

  /**
   * Prepares a full HTTP message body
   *
   * @param {ArcHeaders} httpHeaders The list ogf headers to append.
   * @param {Buffer} buffer The buffer with the HTTP message
   * @return {Buffer} `Buffer` of a HTTP message
   */
  _prepareMessage(httpHeaders, buffer) {
    const headers = [];
    const search = this.uri.search;
    let path = this.uri.pathname;
    if (search) {
      path += search;
    }
    headers.push(`${this.arcRequest.method} ${path} HTTP/1.1`);
    if (this._hostRequired()) {
      headers.push(`Host: ${this.hostHeader}`);
    }
    let str = headers.join('\r\n');
    const addHeaders = httpHeaders.toString();
    if (addHeaders) {
      str += '\r\n';
      str += PayloadSupport.normalizeString(addHeaders);
    }
    const startBuffer = Buffer.from(str, 'utf8');
    const endBuffer = Buffer.from(new Uint8Array([13, 10, 13, 10]));
    let body;
    let sum = startBuffer.length + endBuffer.length;
    if (buffer) {
      sum += buffer.length;
      body = Buffer.concat([startBuffer, endBuffer, buffer], sum);
    } else {
      body = Buffer.concat([startBuffer, endBuffer], sum);
    }
    return body;
  }

  /**
   * Tests if current connection is required to add `host` header.
   * It returns `false` only if `host` header has been already provided.
   *
   * @return {boolean} True when the `host` header should be added to the
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
   * Alters authorization header depending on the `auth` object
   * @param {ArcHeaders} headers A headers object where to append headers if
   * needed
   */
  _handleAuthorization(headers) {
    const { auth, authorization } = this.arcRequest;
    const enabled = Array.isArray(authorization) ? authorization.filter((auth) => auth.enabled) : [];
    if (!auth && !enabled.length) {
      return;
    }
    const legacyAuth = /** @type LegacyAuth */ (auth);
    if (legacyAuth && legacyAuth.method && !enabled.length) {
      this._handleLegacyAuth(headers, legacyAuth);
      return;
    }
    const ntlm = enabled.find((auth) => auth.type === 'ntlm');
    if (ntlm) {
      this._authorizeNtlm(/** @type NtlmAuthorization */ (ntlm.config), headers);
    }
  }

  /**
   * Alters authorization header depending on the `auth` object
   * @param {ArcHeaders} headers A headers object where to append headers if
   * needed
   * @param {LegacyAuth} auth
   */
  _handleLegacyAuth(headers, auth) {
    switch (auth.method) {
      case 'ntlm': this._authorizeNtlm(auth, headers); return;
    }
  }

  /**
   * Authorize the request with NTLM
   * @param {NtlmAuthorization|NtlmAuthLegacy} authData Credentials to use
   * @param {ArcHeaders} headers A headers object where to append headers if
   * needed
   */
  _authorizeNtlm(authData, headers) {
    const init = { ...authData, url: this.arcRequest.url };
    const auth = new NtlmAuth(init);
    if (!this.auth) {
      this.auth = {
        method: 'ntlm',
        state: 0,
        headers: headers.toString(),
      };
      const msg = auth.createMessage1(this.uri.host);
      headers.set('Authorization', `NTLM ${msg.toBase64()}`);
    } else if (this.auth && this.auth.state === 1) {
      const msg = auth.createMessage3(this.auth.challengeHeader, this.uri.host);
      this.auth.state = 2;
      headers.set('Authorization', `NTLM ${msg.toBase64()}`);
    }
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
        const now = Date.now();
        this.stats.firstReceiveTime = now;
        this.emit('firstbyte', this.id);
        received = true;
      }
      data = Buffer.from(data);
      try {
        this._processSocketMessage(data);
      } catch (e) {
        this._errorRequest({
          message: e.message || 'Unknown error occurred',
        });
        return;
      }
    });
    socket.once('timeout', () => {
      this.state = SocketRequest.DONE;
      this._errorRequest(new Error('Connection timeout.'));
      socket.destroy();
    });
    socket.on('end', () => {
      socket.removeAllListeners('timeout');
      socket.removeAllListeners('error');
      const endTime = Date.now();
      this.stats.lastReceivedTime = endTime;
      this.transportRequest.endTime = endTime;
      if (this.state !== SocketRequest.DONE) {
        if (!this.currentResponse) {
          // The parser haven't found the end of message so there was no message!
          this._errorRequest(new Error('Connection closed without sending a data'));
        } else {
          // There is an issue with the response. Size mismatch? Anyway,
          // it tries to create a response from current data.
          this.emit('loadend', this.id);
          this._publishResponse({ includeRedirects: true });
        }
      }
    });
    socket.once('error', (err) => {
      socket.removeAllListeners('timeout');
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
    this._clearSocketEventListeners();
    const endTime = Date.now();
    this.stats.lastReceivedTime = endTime;
    this.transportRequest.endTime = endTime;
    const { status } = this.currentResponse;
    if (status >= 300 && status < 400) {
      if (this.followRedirects && this._reportRedirect(status)) {
        this.closeClient();
        return;
      }
    } else if (status === 401 && this.auth) {
      switch (this.auth.method) {
        case 'ntlm': this.handleNtlmResponse(); return;
      }
    }
    this.closeClient();
    this.emit('loadend', this.id);
    this._publishResponse({ includeRedirects: true });
  }

  /**
   * closes the connection, if any
   */
  closeClient() {
    if (this.socket && !this.socket.destroyed) {
      this.socket.destroy();
    }
  }

  /**
   * Handles the response with NTLM authorization
   */
  handleNtlmResponse() {
    if (this.auth.state === 0) {
      if (this.currentHeaders.has('www-authenticate')) {
        this.auth.state = 1;
        this.auth.challengeHeader = this.currentHeaders.get('www-authenticate');
        this._cleanUpRedirect();
        this.prepareMessage().then((message) => this.writeMessage(message));
        return;
      }
    }
    delete this.auth;
    this.emit('loadend', this.id);
    this._publishResponse({ includeRedirects: true });
  }

  /**
   * Process received message.
   *
   * @param {Buffer} data Received message.
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
   * This function will set `status` and `statusText` fields
   * and then will set `state` to HEADERS.
   *
   * @param {Buffer} data Received data
   * @return {Buffer}
   */
  _processStatus(data) {
    if (this.aborted) {
      return;
    }
    this.currentResponse = /** @type ArcResponse */ ({
      status: 0,
      statusText: '',
      loadingTime: 0,
    });

    if (!data) {
      return;
    }

    this.logger.info('Processing status');
    const index = data.indexOf(nlBuffer);
    let statusLine = data.slice(0, index).toString();
    data = data.slice(index + 2);
    statusLine = statusLine.replace(/HTTP\/\d(\.\d)?\s/, '');
    const delimiterPos = statusLine.indexOf(' ');
    let status;
    let msg = '';
    if (delimiterPos === -1) {
      status = statusLine;
    } else {
      status = statusLine.substr(0, delimiterPos);
      msg = statusLine.substr(delimiterPos + 1);
    }
    let typedStatus = Number(status);
    if (Number.isNaN(typedStatus)) {
      typedStatus = 0;
    }
    if (msg && msg.indexOf('\n') !== -1) {
      msg = msg.split('\n')[0];
    }
    this.currentResponse.status = typedStatus;
    this.currentResponse.statusText = msg;
    this.logger.info('Received status', typedStatus, msg);
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
    this.logger.info('Processing headers');
    // Looking for end of headers section
    let index = data.indexOf(nlNlBuffer);
    let padding = 4;
    if (index === -1) {
      // It can also be 2x ASCII 10
      const _index = data.indexOf(Buffer.from([10, 10]));
      if (_index !== -1) {
        index = _index;
        padding = 2;
      }
    }

    // https://github.com/jarrodek/socket-fetch/issues/3
    const enterIndex = data.indexOf(nlBuffer);
    if (index === -1 && enterIndex !== 0) {
      // end in next chunk
      if (!this.rawHeaders) {
        this.rawHeaders = data;
      } else {
        const sum = this.rawHeaders.length + data.length;
        this.rawHeaders = Buffer.concat([this.rawHeaders, data], sum);
      }
      return;
    }
    if (enterIndex !== 0) {
      const headersArray = data.slice(0, index);
      if (!this.rawHeaders) {
        this.rawHeaders = headersArray;
      } else {
        const sum = this.rawHeaders.length + headersArray.length;
        this.rawHeaders = Buffer.concat([this.rawHeaders, headersArray], sum);
      }
    }
    this._parseHeaders(this.rawHeaders);
    delete this.rawHeaders;
    this.state = SocketRequest.BODY;
    const start = index === -1 ? 0 : index;
    const move = enterIndex === 0 ? 2 : padding;
    data = data.slice(start + move);
    return this._postHeaders(data);
  }

  /**
   * Check the response headers and end the request if necessary.
   * @param {Buffer} data Current response data buffer
   * @return {Buffer}
   */
  _postHeaders(data) {
    if (this.arcRequest.method === 'HEAD') {
      this._reportResponse();
      return;
    }
    if (data.length === 0) {
      if (this.currentHeaders.has('Content-Length')) {
        // If the server do not close the connection and clearly indicate that
        // there are no further data to receive the app can close the connection
        // and prepare the response.
        const length = Number(this.currentHeaders.get('Content-Length'));
        // NaN never equals NaN. This is faster.
        if (!Number.isNaN(length) && length === 0) {
          this._reportResponse();
          return;
        }
      }
      // See: https://github.com/advanced-rest-client/arc-electron/issues/106
      // The client should wait until the connection is closed instead of assuming it should end the request.

      //  else if (!this.currentHeaders.has('Transfer-Encoding') || !this.currentHeaders.get('Transfer-Encoding')) {
      //   // Fix for https://github.com/jarrodek/socket-fetch/issues/6
      //   // There is no body in the response.
      //   // this._reportResponse();
      //   return;
      // }
      return;
    }
    return data;
  }

  /**
   * This function assumes that all headers has been read and it's
   * just before changing the status to BODY.
   *
   * @param {Buffer=} array
   */
  _parseHeaders(array) {
    let raw = '';
    if (array) {
      raw = array.toString();
    }
    this.currentResponse.headers = raw;
    this.logger.info('Received headers list', raw);
    const headers = new ArcHeaders(raw);
    this.currentHeaders = headers;
    if (headers.has('Content-Length')) {
      this._contentLength = Number(headers.get('Content-Length'));
    }
    if (headers.has('Transfer-Encoding')) {
      const tr = headers.get('Transfer-Encoding');
      if (tr === 'chunked') {
        this._chunked = true;
      }
    }
    const detail = {
      returnValue: true,
      value: this.currentResponse.headers,
    };
    this.emit('headersreceived', this.id, detail);
    if (!detail.returnValue) {
      this.abort();
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
    const sum = this._rawBody.length + data.length;
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
      data = Buffer.concat(
        [this.__bodyChunk, data],
        this.__bodyChunk.length + data.length,
      );
      this.__bodyChunk = undefined;
    }
    while (true) {
      if (this.chunkSize === 0 && data.indexOf(nlNlBuffer) === 0) {
        this._reportResponse();
        return;
      }
      if (!this.chunkSize) {
        data = this.readChunkSize(data);
        if (!this.chunkSize && this.chunkSize !== 0) {
          // It may happen that node's buffer cuts the data
          // just before the chunk size.
          // It should proceed it in next portion of the data.
          this.__bodyChunk = data;
          return;
        }
        if (!this.chunkSize) {
          this._reportResponse();
          return;
        }
      }
      const size = Math.min(this.chunkSize, data.length);
      const sliced = data.slice(0, size);
      if (!this._rawBody) {
        this._rawBody = sliced;
      } else {
        const sum = size + this._rawBody.length;
        this._rawBody = Buffer.concat([this._rawBody, sliced], sum);
      }

      this.chunkSize -= size;
      if (data.length === 0) {
        // this.logger.warn('Next chunk will start with CRLF!');
        return;
      }
      data = data.slice(size + 2); // + CR
      if (data.length === 0) {
        // this.logger.info('No more data here. Waiting for new chunk');
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
        this.chunkSize = 0;
        return Buffer.alloc(0);
      }
      array = array.slice(index + 2);
      index = array.indexOf(nlBuffer);
    }
    // this.logger.info('Size index: ', index);
    const chunkSize = parseInt(array.slice(0, index).toString(), 16);
    if (Number.isNaN(chunkSize)) {
      this.chunkSize = undefined;
      return array.slice(index + 2);
    }
    this.chunkSize = chunkSize;
    return array.slice(index + 2);
  }

  /**
   * Generate response object and publish it to the listeners.
   *
   * @param {Object} opts See #_createResponse for more info.
   * @return {Promise}
   */
  _publishResponse(opts) {
    this.state = SocketRequest.DONE;
    return super._publishResponse(opts);
  }
}
