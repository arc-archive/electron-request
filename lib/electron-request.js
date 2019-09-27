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
import url from 'url';
import http from 'http';
import https from 'https';
import { PayloadSupport } from './payload-support';
import { ArcHeaders } from './arc-headers';
import { RequestUtils } from './utils';
import { BaseRequest } from './base-request';
/**
 * A HTTP client for ARC that uses Electron APIs to make a request.
 * @extends BaseRequest
 */
export class ElectronRequest extends BaseRequest {
  /**
   * @param {Object} request
   * @param {?Object} options
   */
  constructor(request, options) {
    super(request, options);
    // handlers
    this._connectHandler = this._connectHandler.bind(this);
    this._secureConnectHandler = this._secureConnectHandler.bind(this);
    this._responseHandler = this._responseHandler.bind(this);
    this._timeoutHandler = this._timeoutHandler.bind(this);
    this._errorHandler = this._errorHandler.bind(this);
    this._lookupHandler = this._lookupHandler.bind(this);
    this._closeHandler = this._closeHandler.bind(this);
    this._socketHandler = this._socketHandler.bind(this);
    this._sendEndHandler = this._sendEndHandler.bind(this);
  }

  /**
   * Cleans the state after finished.
   */
  _cleanUp() {
    super._cleanUp();
    this._sentHttpMessage = undefined;
    this.responseReported = false;
  }
  /**
   * Cleans up the state for redirect.
   */
  _cleanUpRedirect() {
    super._cleanUpRedirect();
    this._sentHttpMessage = undefined;
  }
  /**
   * Sends the request
   * @return {Promise}
   */
  async send() {
    this.abort();
    this.aborted = false;
    const message = await this._prepareMessage();
    const request = this._connect(message);
    this.request = request;
    const timeout = this.timeout;
    if (timeout && timeout > 0) {
      request.setTimeout(timeout);
    }
  }

  /**
   * Prepares a HTTP message from ARC's request object.
   *
   * @return {Promise} Resolved promise to an `ArrayBuffer`.
   */
  async _prepareMessage() {
    let payload = this.arcRequest.payload;
    if (['get', 'head'].indexOf(this.arcRequest.method.toLowerCase()) !== -1) {
      payload = undefined;
    }
    const headers = new ArcHeaders(this.arcRequest.headers);
    this._prepareHeaders(headers);
    const buffer = await PayloadSupport.payloadToBuffer(payload, headers);
    RequestUtils.addContentLength(this.arcRequest.method, buffer, headers);
    this.arcRequest.headers = headers.toString();
    return buffer;
  }
  /**
   * Connects to a remote machine.
   * @param {Buffer} message
   * @return {Promise} [description]
   */
  _connect(message) {
    const uri = url.parse(this.arcRequest.url);
    const port = RequestUtils.getPort(uri.port, uri.protocol);
    if (port === 443 || uri.protocol === 'https:') {
      return this._connectSsl(message, uri);
    } else {
      return this._connectHttp(message, uri);
    }
  }
  /**
   * Creates a default options for a request.
   * @param {Object} uri Instance of URL class for current URL.
   * @return {Object}
   */
  _createGenericOptions(uri) {
    const result = {
      protocol: uri.protocol,
      slashes: uri.slashes,
      host: uri.host,
      port: uri.port,
      hostname: uri.hostname,
      hash: uri.hash,
      search: uri.search,
      pathname: uri.pathname,
      path: uri.path,
      href: uri.href,
      method: this.arcRequest.method.toUpperCase(),
      headers: {},
    };
    const headers = new ArcHeaders(this.arcRequest.headers);
    for (const [key, value] of headers.entries()) {
      result.headers[key] = value;
    }
    return result;
  }
  /**
   * Adds SSL options to the request.
   * @param {Object} options
   */
  _addSslOptions(options) {
    if (this.opts.validateCertificates) {
      options.checkServerIdentity = this._checkServerIdentity.bind(this);
    } else {
      options.rejectUnauthorized = false;
      options.requestOCSP = false;
    }
    options.agent = new https.Agent(options);
  }
  /**
   * Creates a connection using regular transport.
   * @param {Buffer} message
   * @param {URL} uri
   * @return {Object}
   */
  _connectHttp(message, uri) {
    if (!uri.port) {
      uri.port = 80;
    }
    const options = this._createGenericOptions(uri);
    this.stats.startTime = Date.now();
    const request = http.request(options);
    this._setCommonListeners(request);
    if (message) {
      request.write(message);
    }
    this.stats.messageStart = Date.now();
    request.end();
    try {
      this.emit('loadstart', this.id);
    } catch (_) {}
    return request;
  }
  /**
   * Creates a connection using SSL transport.
   * @param {Buffer} message
   * @param {URL} uri
   * @return {Object}
   */
  _connectSsl(message, uri) {
    if (!uri.port) {
      uri.port = 443;
    }
    const options = this._createGenericOptions(uri);
    this._addSslOptions(options);
    this.stats.startTime = Date.now();
    const request = https.request(options);
    this._setCommonListeners(request);
    if (message) {
      request.write(message);
    }
    this.stats.messageStart = Date.now();
    this.stats.sentTime = this.stats.messageStart + 1;
    request.end();
    try {
      this.emit('loadstart', this.id);
    } catch (_) {}
    return request;
  }
  /**
   * Sets listeners on a socket
   * @param {Object} request The request object
   */
  _setCommonListeners(request) {
    request.once('socket', this._socketHandler);
    request.once('error', this._errorHandler);
    request.once('response', this._responseHandler);
    request.once('close', this._closeHandler);
  }
  /**
   * Handler for connection error.
   * @param {Object} e
   */
  _errorHandler(e) {
    if (this.aborted) {
      return;
    }
    this._errorRequest({
      code: e.code,
      message: e.message,
    });
  }
  /**
   * Handler for DNS lookup.
   */
  _lookupHandler() {
    this.stats.lookupTime = Date.now();
  }
  /**
   * Handler for connected event.
   */
  _secureConnectHandler() {
    this.stats.secureConnectedTime = Date.now();
  }
  /**
   * Handler for connecting event.
   */
  _connectHandler() {
    this.stats.connectedTime = Date.now();
    this.stats.secureStartTime = Date.now();
  }
  /**
   * Handler for sending finished event
   */
  _sendEndHandler() {
    if (!this.stats.sentTime) {
      this.stats.sentTime = Date.now();
    }
  }
  /**
   * Handler for timeout event
   */
  _timeoutHandler() {
    this._errorRequest({
      code: 7,
    });
    this.abort();
  }
  /**
   * A handler for response data event
   * @param {Object} res
   */
  _responseHandler(res) {
    this.emit('firstbyte', this.id);
    this.stats.firstReceiveTime = Date.now();
    this.stats.responseTime = Date.now();
    if (this._sentHttpMessage) {
      this.arcRequest.sentHttpMessage = this._readSentMessage(this._sentHttpMessage);
    }
    const status = res.statusCode;
    const headers = res.headers;
    const arcHeaders = new ArcHeaders(headers);
    const rawHeaders = arcHeaders.toString();
    this._response = {
      status,
      statusText: res.statusMessage,
      headers: rawHeaders,
      _headers: arcHeaders,
    };
    const detail = {
      returnValue: true,
      value: rawHeaders,
    };
    this.emit('headersreceived', this.id, detail);
    if (!detail.returnValue) {
      this.abort();
      return;
    }
    res.on('data', (chunk) => {
      if (!this._rawBody) {
        this._rawBody = chunk;
      } else {
        this.stats.lastReceivedTime = Date.now();
        this._rawBody = Buffer.concat([this._rawBody, chunk]);
      }
    });

    res.once('end', () => {
      this.stats.receivingTime = Date.now();
      this._reportResponse();
    });
  }
  /**
   * Handler for connection close event
   */
  _closeHandler() {
    if (this.responseReported || this.aborted || this.redirecting) {
      return;
    }
    if (!this._response) {
      // The parser havn't found the end of message so there was no message!
      this._errorRequest(
          new Error('Connection closed without sending a data'));
    } else {
      // There is an issue with the response. Size missmatch? Anyway,
      // it tries to create a response from current data.
      this.emit('loadend', this.id);
      this._publishResponse({
        includeRedirects: true,
      });
    }
  }
  /**
   * @param {Object} socket
   */
  _socketHandler(socket) {
    this.socket = socket;
    socket.once('lookup', this._lookupHandler);
    socket.once('connect', this._connectHandler);
    socket.once('timeout', this._timeoutHandler);
    socket.once('end', this._sendEndHandler);
    socket.once('secureConnect', this._secureConnectHandler);
    this.stats.connectionTime = Date.now();
    this._sentHttpMessage = socket._pendingData;
  }
  /**
   * Creates and publishes a response.
   */
  _reportResponse() {
    if (this.aborted) {
      return;
    }
    const status = this._response.status;
    if (status >= 300 && status < 400) {
      if (this.followRedirects !== false && this._reportRedirect(status)) {
        return;
      }
    }
    if (this.responseReported) {
      return;
    }
    this.responseReported = true;
    this.emit('loadend', this.id);
    this._publishResponse({
      includeRedirects: true,
    });
  }
  /**
   * Transforms read sent message from the client to a string.
   * It uses `opts.sentMessageLimit` to limit number of data returned
   * by the client.
   * @param {String|Array<Object>} messages
   * @return {String}
   */
  _readSentMessage(messages) {
    let result = '';
    if (typeof messages === 'string') {
      result = messages;
    } else {
      for (let i = 0, len = messages.length; i < len; i++) {
        const chunk = messages[i].chunk;
        if (!chunk) {
          continue;
        }
        if (typeof chunk === 'string') {
          result += chunk;
        } else if (chunk instanceof Uint8Array) {
          result += chunk.toString();
        }
      }
    }
    const limit = this.opts.sentMessageLimit;
    if (limit && limit > 0 && result.length >= limit) {
      result = result.substr(0, limit) + ' ...';
    }
    return result;
  }
}
