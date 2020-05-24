import { UrlWithStringQuery } from 'url';
import { ConnectionOptions } from 'tls';
import { Socket } from 'net';
import { EventEmitter } from 'events';
import { RequestOptions, Logger } from './RequestOptions';
import { ArcHeaders } from './ArcHeaders';
import { Options } from './RequestOptions';
import { RedirectOptions } from './RequestUtils';
import { ArcRequest, ArcResponse, ArcCertificate, RequestTimings, ResponsePublishOptions, HostRule } from './RequestTypes';

declare interface ErrorRequestOptions {
  code?: number;
  message?: string;
}

declare interface AuthStruct {
  method: string;
  headers?: string;
  state?: number;
  challengeHeader?: string;
}

declare interface RequestStats {
  firstReceiveTime?: number;
  lastReceivedTime?: number;
  messageStart?: number;
  sentTime?: number;
  connectionTime?: number;
  lookupTime?: number;
  connectedTime?: number;
  secureStartTime?: number;
  secureConnectedTime?: number;
  startTime?: number;
  responseTime?: number;
  receivingTime?: number;
}

/**
 * Base class for all HTTP clients.
 */
export declare class BaseRequest extends EventEmitter {
  opts: RequestOptions;
  logger: Logger;
  arcRequest: ArcRequest;
  /**
   * When true the request has been aborted.
   */
  aborted: boolean;
  /**
   * The ID of the request to be report back with events.
   */
  id: string;
  /**
   * Stats object to compute request statistics
   */
  stats: RequestStats;
  /**
   * Hosts table. See options class for description.
   */
  hosts: HostRule[];
  /**
   * Parsed value of the request URL.
   */
  uri: UrlWithStringQuery;
  socket: Socket;
  /**
   * Host header can be different than registered URL because of
   * `hosts` rules.
   * If a rule changes host value of the URL the original URL's host value
   * is used when generating the request and not overriden one.
   * This way virual hosts can be tested using hosts.
   */
  hostHeader: string;
  _hostTestReg: RegExp;
  auth: AuthStruct|null;
  redirecting: boolean;
  /**
   * Request timeout.
   */
  readonly timeout: number|undefined;
  /**
   * True if following redirects is allowed.
   */
  readonly followRedirects: boolean;

  on(event: 'beforeredirect', listener: (id: string, detail: object) => void): this;
  on(event: 'error', listener: (error: Error, id: string, arcRequest: ArcRequest, response: ArcResponse) => void): this;
  on(event: 'load', listener: (id: string, response: ArcResponse, arcRequest: ArcRequest) => void): this;
  on(event: 'loadstart', listener: (id: string) => void): this;
  on(event: 'firstbyte', listener: (id: string) => void): this;
  on(event: 'headersreceived', listener: (id: string, detail: object) => void): this;
  on(event: 'loadend', listener: (id: string) => void): this;

  constructor(request: ArcRequest, options?: Options);

  /**
   * Updates the `uri` property from current request URL
   * @param value The request URL
   */
  _updateUrl(value: string): void;

  /**
   * Creates a logger object to log debug output.
   */
  __setupLogger(opts: object): object;

  /**
   * Prints varning messages to the logger.
   */
  _printValidationWarnings(): void;

  /**
   * Cleans the state after finished.
   */
  _cleanUp(): void;

  /**
   * Cleans up the state for redirect.
   */
  _cleanUpRedirect(): void;

  /**
   * Aborts current request.
   * It emitts `error` event
   */
  abort(): void;

  /**
   * Decompresses received body if `content-encoding` header is set.
   *
   * @param body A body buffer to decompress.
   * @returns Promise resolved to parsed body
   */
  _decompress(body: Buffer): Promise<Buffer>;

  /**
   * Decompress body with Inflate.
   * @param body Received response payload
   * @returns Promise resolved to decompressed buffer.
   */
  _inflate(body: Buffer): Promise<Buffer>;

  /**
   * Decompress body with ZLib.
   * @param body Received response payload
   * @returns Promise resolved to decompressed buffer.
   */
  _gunzip(body: Buffer): Promise<Buffer>;

  /**
   * Decompress Brotli.
   * @param body Received response payload
   * @returns Promise resolved to decompressed buffer.
   */
  _brotli(body: Buffer): Promise<Buffer>;

  /**
   * Reports response when redirected.
   * @param status Received status code
   * @returns True if the request has been redirected.
   */
  _reportRedirect(status: number): boolean;

  /**
   * Creates a response and adds it to the redirects list and redirects
   * the request to the new location.
   *
   * @param options Redirection options
   */
  _redirectRequest(options: RedirectOptions): Promise<void>;

  /**
   * Create a `Response` object.
   *
   * @param opts Options to construct a response object.
   * @returns A response object.
   */
  _createResponse(opts?: ResponsePublishOptions): Promise<ArcResponse>;

  /**
   * Finishes the response with error message.
   * @param opts `code` and `message`
   */
  _errorRequest(opts: ErrorRequestOptions): void;

  /**
   * Generates authorization info object from response.
   */
  _getAuth(): object;

  /**
   * Generate response object and publish it to the listeners.
   */
  _publishResponse(opts: ResponsePublishOptions): Promise<void>;

  /**
   * Creats HAR 1.2 timings object from stats.
   * @param stats Timings object
   */
  _computeStats(stats: RequestStats): RequestTimings;

  /**
   * Handles cookie exchange when redirecting the request.
   * @param responseCookies Cookies received in the resposne
   * @param location Redirect destination
   */
  _processRedirectCookies(responseCookies: string, location: string): void;

  /**
   * Checks certificate identity using TLS api.
   * @param host Request host name
   * @param cert TLS's certificate info object
   */
  _checkServerIdentity(host: string, cert: Object): Error|undefined;

  /**
   * Clears event listeners of the socket object,
   */
  _clearSocketEventListeners(): void;

  /**
   * Prepares headers list to be send to the remote machine.
   * If `defaultHeaders` option is set then it adds `user-agent` and `accept`
   * headers.
   * @param headers Parsed headers
   */
  _prepareHeaders(headers: ArcHeaders): void;

  /**
   * Adds client certificate to the request configurtaion options.
   *
   * @param cert List of certificate configurations.
   * @param options Request options. Cert agent options are
   * added to this object.
   */
  _addClientCertificate(cert: ArcCertificate, options: ConnectionOptions): void;
}
