import zlib from 'zlib';
import url from 'url';
import tls from 'tls';
import { EventEmitter } from 'events';
import { Cookies } from '@advanced-rest-client/cookie-parser/cookie-parser.js';
import { RequestOptions } from './RequestOptions.js';
import { RequestUtils } from './RequestUtils.js';
import { HttpErrorCodes } from './HttpErrorCodes.js';
import { ArcHeaders } from './ArcHeaders.js';
import { HostRulesEval } from './HostRulesEval.js';

/** @typedef {import('./RequestTypes').ArcRequest} ArcRequest */
/** @typedef {import('./RequestTypes').ArcCertificate} ArcCertificate */
/** @typedef {import('./RequestTypes').RequestTimings} RequestTimings */
/** @typedef {import('./RequestTypes').ResponsePublishOptions} ResponsePublishOptions */
/** @typedef {import('./RequestTypes').ArcResponse} ArcResponse */
/** @typedef {import('./RequestOptions').Options} Options */
/** @typedef {import('./RequestUtils').RedirectOptions} RedirectOptions */

/**
 * Base class for all HTTP clients.
 * @extends EventEmitter
 */
export class BaseRequest extends EventEmitter {
  /**
   * @param {ArcRequest} request
   * @param {Options=} options
   */
  constructor(request, options) {
    super();
    let opts = options;
    if (!(opts instanceof RequestOptions)) {
      opts = new RequestOptions(opts);
    }
    this.opts = /** @type RequestOptions */ (opts);
    this.logger = this.__setupLogger(opts);
    this._printValidationWarnings();
    this.arcRequest = { ...request };
    /**
     * When true the request has been aborted.
     * @type {boolean}
     */
    this.aborted = false;
    /**
     * The ID of the request to be report back with events.
     * @type {string}
     */
    this.id = request.id;
    /**
     * Stats object to compute request statistics
     * @type {object}
     */
    this.stats = {};
    /**
     * Hosts table. See options class for description.
     * @type {object|undefined}
     */
    this.hosts = opts.hosts;
    /**
     * Parsed value of the request URL.
     * @type {url.UrlWithStringQuery}
     */
    this.uri = undefined;
    this._updateUrl(request.url);
    this.socket = undefined;
    /**
     * Host header can be different than registered URL because of
     * `hosts` rules.
     * If a rule changes host value of the URL the original URL's host value
     * is used when generating the request and not overriden one.
     * This way virual hosts can be tested using hosts.
     *
     * @type {string}
     */
    this.hostHeader = RequestUtils.getHostHeader(request.url);
    this._hostTestReg = /^\s*host\s*:/im;
    this.auth = null;
    this.redirecting = false;
  }

  /**
   * @return {number|undefined} Request timeout.
   */
  get timeout() {
    if (
      this.arcRequest.config &&
      typeof this.arcRequest.config.timeout === 'number'
    ) {
      return this.arcRequest.config.timeout;
    }
    if (typeof this.opts.timeout === 'number') {
      return this.opts.timeout;
    }
    return undefined;
  }

  /**
   * @return {boolean} True if following redirects is allowed.
   */
  get followRedirects() {
    if (
      this.arcRequest.config &&
      typeof this.arcRequest.config.followRedirects === 'boolean'
    ) {
      return this.arcRequest.config.followRedirects;
    }
    if (typeof this.opts.followRedirects === 'boolean') {
      return this.opts.followRedirects;
    }
    return false;
  }

  /**
   * Updates the `uri` property from current request URL
   * @param {string} value The request URL
   */
  _updateUrl(value) {
    value = HostRulesEval.applyHosts(value, this.hosts);
    this.uri = url.parse(value);
  }

  /**
   * Creates a logger object to log debug output.
   *
   * @param {Options} opts
   * @return {Object}
   */
  __setupLogger(opts) {
    if (opts.logger) {
      return opts.logger;
    }
    return require('electron-log');
  }

  /**
   * Prints varning messages to the logger.
   */
  _printValidationWarnings() {
    const warnings = this.opts.validationWarnings;
    if (!warnings || !warnings.length) {
      return;
    }
    warnings.forEach((warning) => {
      this.logger.warn(warning);
    });
  }

  /**
   * Cleans the state after finished.
   */
  _cleanUp() {
    this.redirects = undefined;
    this._response = undefined;
    this._rawBody = undefined;
    this.redirecting = false;
    this.stats = {};
    this._clearSocketEventListeners();
  }

  /**
   * Cleans up the state for redirect.
   */
  _cleanUpRedirect() {
    this._response = undefined;
    this._rawBody = undefined;
    this.stats = {};
    this._clearSocketEventListeners();
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
    this.socket = undefined;
  }

  /**
   * Decompresses received body if `content-encoding` header is set.
   *
   * @param {Buffer} body A body buffer to decompress.
   * @return {Promise<Buffer>} Promise resolved to parsed body
   */
  async _decompress(body) {
    if (this.aborted || !body) {
      return;
    }
    const ceHeader = 'content-encoding';
    if (!this._response._headers.has(ceHeader)) {
      return body;
    }
    const ce = this._response._headers.get(ceHeader);
    if (ce.indexOf('deflate') !== -1) {
      return this._inflate(body);
    }
    if (ce.indexOf('gzip') !== -1) {
      return this._gunzip(body);
    }
    if (ce.indexOf('br') !== -1) {
      return this._brotli(body);
    }
    return body;
  }

  /**
   * Decompress body with Inflate.
   * @param {Buffer} body Received response payload
   * @return {Promise<Buffer>} Promise resolved to decompressed buffer.
   */
  _inflate(body) {
    body = Buffer.from(body);
    return new Promise((resolve, reject) => {
      zlib.inflate(body, (err, buffer) => {
        if (err) {
          reject(new Error(err.message || String(err)));
        } else {
          resolve(buffer);
        }
      });
    });
  }

  /**
   * Decompress body with ZLib.
   * @param {Buffer} body Received response payload
   * @return {Promise<Buffer>} Promise resolved to decompressed buffer.
   */
  _gunzip(body) {
    body = Buffer.from(body);
    return new Promise((resolve, reject) => {
      zlib.gunzip(body, (err, buffer) => {
        if (err) {
          reject(new Error(err.message || String(err)));
        } else {
          resolve(buffer);
        }
      });
    });
  }

  /**
   * Decompress Brotli.
   * @param {Buffer} body Received response payload
   * @return {Promise<Buffer>} Promise resolved to decompressed buffer.
   */
  _brotli(body) {
    body = Buffer.from(body);
    return new Promise((resolve, reject) => {
      zlib.brotliDecompress(body, (err, buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(buffer);
        }
      });
    });
  }

  /**
   * Reports response when redirected.
   * @param {number} status Received status code
   * @return {boolean} True if the request has been redirected.
   */
  _reportRedirect(status) {
    // https://github.com/jarrodek/socket-fetch/issues/13
    const redirectOptions = RequestUtils.redirectOptions(
      status,
      this.arcRequest.method,
      this._response._headers.get('location')
    );
    if (!redirectOptions.redirect) {
      return false;
    }
    this.redirecting = true;
    // @ts-ignore
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.setTimeout(() => this._redirectRequest(redirectOptions));
    } else {
      process.nextTick(() => this._redirectRequest(redirectOptions));
    }
    return true;
  }

  /**
   * Creates a response and adds it to the redirects list and redirects
   * the request to the new location.
   *
   * @param {RedirectOptions} options A redirection options:
   * forceGet {Boolean} - If true the redirected request will be GET request
   * location {String} - location of the resource (redirect uri)
   */
  async _redirectRequest(options) {
    if (this.followRedirects === false) {
      this._publishResponse({
        includeRedirects: true,
      });
      return;
    }
    const location = RequestUtils.getRedirectLocation(
      options.location,
      this.arcRequest.url
    );
    if (!location) {
      this._errorRequest({
        code: 302,
      });
      return;
    }

    // check if this is infinite loop
    if (RequestUtils.isRedirectLoop(location, this.redirects)) {
      this._errorRequest({
        code: 310,
      });
      return;
    }
    const detail = {
      location,
      returnValue: true,
    };
    this.emit('beforeredirect', this.id, detail);
    if (!detail.returnValue) {
      this._publishResponse({
        includeRedirects: true,
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
    try {
      const response = await this._createResponse({
        includeRedirects: false,
      });
      this.redirects.add(response);
      this._cleanUpRedirect();
      if (responseCookies) {
        this._processRedirectCookies(responseCookies, location);
      }
      this.redirecting = false;
      this.arcRequest.url = location;
      if (options.forceGet) {
        this.arcRequest.method = 'GET';
      }
      this._updateUrl(location);
      this.hostHeader = RequestUtils.getHostHeader(location);
      // No idea why but without setTimeout the program loses it's
      // scope after calling the function.
      // @ts-ignore
      if (typeof window !== 'undefined') {
        // @ts-ignore
        window.setTimeout(() => this.send());
      } else {
        // @ts-ignore
        process.nextTick(() => this.send());
      }
    } catch (e) {
      this._errorRequest({
        message: (e && e.message) || 'Unknown error occurred',
      });
    }
  }

  /**
   * Create a `Response` object.
   *
   * @param {ResponsePublishOptions=} opts Options to construct a response object.
   * @return {Promise<ArcResponse>} A response object.
   */
  async _createResponse(opts = {}) {
    if (opts.error) {
      const resp = {
        isError: true,
        error: new Error(opts.error.message),
        sentHttpMessage: this.arcRequest.sentHttpMessage,
        stats: this._computeStats(this.stats),
      };
      if (opts.includeRedirects && this.redirects && this.redirects.size) {
        resp.redirects = Array.from(this.redirects);
      }
      return resp;
    }
    if (this.aborted) {
      return;
    }
    const status = this._response.status;
    if (status < 100 || status > 599) {
      throw new Error(`The response status "${status}" is not allowed.
      See HTTP spec for more details: https://tools.ietf.org/html/rfc2616#section-6.1.1`);
    } else if (status === undefined) {
      throw new Error(`The response status is empty.
      It means that the successful connection wasn't made.
      Check your request parameters.`);
    }
    const body = await this._decompress(this._rawBody);
    const response = {
      status,
      statusText: this._response.statusText,
      headers: this._response.headers,
      url: this.arcRequest.url,
      payload: body,
      stats: this._computeStats(this.stats),
      sentHttpMessage: this.arcRequest.sentHttpMessage,
    };
    if (opts.includeRedirects && this.redirects && this.redirects.size) {
      response.redirects = Array.from(this.redirects);
    }
    if (status === 401) {
      response.auth = this._getAuth();
    }
    return response;
  }

  /**
   * Finishes the response with error message.
   * @param {Object} opts `code` and `message`
   * @param {number=} opts.code
   * @param {string=} opts.message
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
    let response;
    if (this._response && this._response.status) {
      response = {
        status: this._response.status,
        statusText: this._response.statusText,
        headers: this._response.headers,
        url: this.arcRequest.url,
        stats: this._computeStats(this.stats),
        sentHttpMessage: this.arcRequest.sentHttpMessage,
      };
    }
    const error = new Error(message);
    this.emit('error', error, this.id, this.arcRequest, response);
    this._cleanUp();
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
    let auth;
    if (this._response._headers.has('www-authenticate')) {
      auth = this._response._headers.get('www-authenticate');
    }
    const result = {
      method: 'unknown',
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
   * Generate response object and publish it to the listeners.
   *
   * @param {ResponsePublishOptions} opts
   * @return {Promise<void>}
   */
  async _publishResponse(opts) {
    if (this.aborted) {
      return;
    }
    try {
      const response = await this._createResponse(opts);
      this.emit('load', this.id, response, this.arcRequest);
      this._cleanUp();
      this.abort();
    } catch (e) {
      this._errorRequest({
        message: (e && e.message) || 'Unknown error occurred',
      });
    }
  }

  /**
   * Creats HAR 1.2 timings object from stats.
   * @param {Object} stats Timings object
   * @return {RequestTimings}
   */
  _computeStats(stats) {
    let {
      sentTime,
      messageStart,
      connectionTime,
      lookupTime,
      connectedTime,
      secureStartTime,
      secureConnectedTime,
      lastReceivedTime,
      firstReceiveTime,
    } = stats;
    const type = 'number';
    if (typeof lookupTime !== type) {
      lookupTime = 0;
    }
    let send = sentTime && messageStart ? sentTime - messageStart : -1;
    if (send < 0) {
      send = 0;
    }
    const dns = lookupTime ? lookupTime - connectionTime : -1;
    const connect =
      connectedTime && lookupTime ? connectedTime - lookupTime : -1;
    let receive =
      lastReceivedTime && firstReceiveTime
        ? lastReceivedTime - firstReceiveTime
        : -1;
    if (receive < 0) {
      receive = 0;
    }
    let wait = firstReceiveTime && sentTime ? firstReceiveTime - sentTime : -1;
    if (wait < 0) {
      wait = 0;
    }
    let ssl = -1;
    if (
      typeof secureStartTime === type &&
      typeof secureConnectedTime === type
    ) {
      ssl = secureConnectedTime - secureStartTime;
    }
    return {
      connect,
      receive,
      send,
      wait,
      dns,
      ssl,
    };
  }

  /**
   * Handles cookie exchange when redirecting the request.
   * @param {string} responseCookies Cookies received in the resposne
   * @param {string} location Redirect destination
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
   * Checks certificate identity using TLS api.
   * @param {string} host Request host name
   * @param {Object} cert TLS's certificate info object
   * @return {Error|undefined}
   */
  _checkServerIdentity(host, cert) {
    const err = tls.checkServerIdentity(host, cert);
    if (err) {
      return err;
    }
  }

  /**
   * Clears event listeners of the socket object,
   */
  _clearSocketEventListeners() {
    if (!this.socket) {
      return;
    }
    this.socket.removeAllListeners('error');
    this.socket.removeAllListeners('timeout');
    this.socket.removeAllListeners('end');
  }

  /**
   * Prepares headers list to be send to the remote machine.
   * If `defaultHeaders` option is set then it adds `user-agent` and `accept`
   * headers.
   * @param {ArcHeaders} headers Parsed headers
   */
  _prepareHeaders(headers) {
    if (!this.opts.defaultHeaders) {
      return;
    }
    if (!headers.has('user-agent')) {
      if (this.opts.defaultUserAgent) {
        headers.set('user-agent', this.opts.defaultUserAgent);
      }
    }
    if (!headers.has('accept')) {
      if (this.opts.defaulAccept) {
        headers.set('accept', this.opts.defaulAccept);
      }
    }
  }

  /**
   * Adds client certificate to the request configurtaion options.
   *
   * @param {ArcCertificate} cert List of certificate configurations.
   * @param {tls.ConnectionOptions} options Request options. Cert agent options are
   * added to this object.
   */
  _addClientCertificate(cert, options) {
    if (!cert) {
      return;
    }
    if (!Array.isArray(cert.cert)) {
      cert.cert = [cert.cert];
    }
    if (cert.type === 'p12') {
      options.pfx = cert.cert.map((item) => {
        const struct = {
          buf: item.data,
        };
        if (item.passphrase) {
          struct.passphrase = item.passphrase;
        }
        return struct;
      });
    } else if (cert.type === 'pem') {
      options.cert = cert.cert.map((item) => item.data);
      if (cert.key) {
        if (!Array.isArray(cert.key)) {
          cert.key = [cert.key];
        }
        options.key = cert.key.map((item) => {
          const struct = {
            pem: item.data,
          };
          if (item.passphrase) {
            struct.passphrase = item.passphrase;
          }
          return struct;
        });
      }
    }
  }
}
