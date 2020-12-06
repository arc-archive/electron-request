import { URL, UrlWithStringQuery } from 'url';
import { ClientRequest } from 'http';
import { Socket } from 'net';
import { ArcRequest } from '@advanced-rest-client/arc-types';
import { BaseRequest } from './BaseRequest.js';
import { Options } from './RequestOptions';

/**
 * A HTTP client for ARC that uses Electron APIs to make a request.
 */
export declare class ElectronRequest extends BaseRequest {
  /**
   * @param request
   * The id of the request, used with events and when reporting the response.
   * @param options
   */
  constructor(request: ArcRequest.ArcBaseRequest, id: string, options?: Options);

  /**
   * Cleans the state after finished.
   */
  _cleanUp(): void;

  /**
   * Cleans up the state for redirect.
   */
  _cleanUpRedirect(): void;

  /**
   * Sends the request
   * @return {Promise}
   */
  send(): Promise<void>;

  /**
   * Prepares a HTTP message from ARC's request object.
   *
   * @returns A Promise resolved to a `Buffer`.
   */
  _prepareMessage(): Promise<Buffer>;

  /**
   * Connects to a remote machine.
   * @param {Buffer} message
   * @return {http.ClientRequest} [description]
   */
  _connect(message: Buffer): ClientRequest;

  /**
   * Creates a default options for a request.
   * @param uri Instance of URL class for current URL.
   */
  _createGenericOptions(uri: URL|UrlWithStringQuery): any;

  /**
   * Adds SSL options to the request.
   * @param {Object} options
   */
  _addSslOptions(options: Object): void;

  /**
   * Creates a connection using regular transport.
   */
  _connectHttp(message: Buffer, uri: URL): ClientRequest;

  /**
   * Creates a connection using SSL transport.
   */
  _connectSsl(message: Buffer, uri: URL): ClientRequest;

  /**
   * Sets listeners on a socket
   * @param request The request object
   */
  _setCommonListeners(request: ClientRequest): void;

  /**
   * Handler for connection error.
   */
  _errorHandler(e: object): void;

  /**
   * Handler for DNS lookup.
   */
  _lookupHandler(): void;

  /**
   * Handler for connected event.
   */
  _secureConnectHandler(): void;

  /**
   * Handler for connecting event.
   */
  _connectHandler(): void;

  /**
   * Handler for sending finished event
   */
  _sendEndHandler(): void;

  /**
   * Handler for timeout event
   */
  _timeoutHandler(): void;

  /**
   * A handler for response data event
   */
  _responseHandler(res: Object): void;

  /**
   * Handler for connection close event
   */
  _closeHandler(): void;

  _socketHandler(socket: Socket): void;

  /**
   * Creates and publishes a response.
   */
  _reportResponse(): void;

  /**
   * Transforms a message from the client to a string.
   * It uses `opts.sentMessageLimit` to limit number of data returned
   * by the client.
   */
  _readSentMessage(messages: string|object[]): string;
}
