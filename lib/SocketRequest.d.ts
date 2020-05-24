import { Socket } from 'net';
import { ArcHeaders } from './ArcHeaders';
import { BaseRequest } from './BaseRequest';
import { Options } from './RequestOptions';
import { ArcRequest, LegacyAuth, NtlmAuthorization, NtlmAuthLegacy, ResponsePublishOptions } from './RequestTypes';

/**
 * Transport library for Advanced REST Client for node via Electron app.
 */
export declare class SocketRequest extends BaseRequest {
  state: number;
  /**
   * Constructs the request from ARC's request object
   *
   * @param request ARC's request object
   * @param options Optional. Request configuration options
   */
  constructor(request: ArcRequest, options: Options);

  /**
   * Status indicating thet expecting a ststus message.
   */
  static readonly STATUS: number;

  /**
   * Status indicating thet expecting headers.
   *
   * @default 1
   */
  static readonly HEADERS: number;

  /**
   * Status indicating thet expecting a body message.
   *
   * @default 2
   */
  static readonly BODY: number;

  /**
   * Status indicating thet the message has been read and
   * connection is closing or closed.
   *
   * @default 0
   */
  static readonly DONE: number;

  /**
   * Cleans the state after finished.
   */
  _cleanUp(): void;

  /**
   * Cleans up the state for redirect.
   */
  _cleanUpRedirect(): void;

  /**
   * Sends the request.
   */
  send(): Promise<void>;

  /**
   * Prepares a HTTP message from ARC's request object.
   *
   * @return Resolved promise to a `Buffer`.
   */
  prepareMessage(): Promise<Buffer>;

  /**
   * Sends a data to a socket.
   *
   * @param buffer HTTP message to send
   */
  writeMessage(buffer: Buffer): Promise<void>

  /**
   * Connects to a server and sends the message.
   *
   * @return Promise resolved when socket is connected.
   */
  connect(): Promise<Socket>;

  /**
   * Connects to a server and writtes a message using insecured connection.
   *
   * @param port A port number to connect to.
   * @param host A host name to connect to
   * @returns A promise resolved when the message was sent to a server
   */
  _connect(port: number, host: string): Promise<Socket>

  /**
   * Connects to a server and writtes a message using secured connection.
   *
   * @param port A port number to connect to.
   * @param host A host name to connect to
   * @returns A promise resolved when the message was sent to a server
   */
  _connectTls(port: number, host: string): Promise<Socket>;

  /**
   * Prepares a full HTTP message body
   *
   * @param buffer Optional, body `Buffer`
   * @returns `Buffer` of a HTTP message
   */
  _prepareMessage(buffer?: Buffer): Buffer;

  /**
   * Tests if current connection is required to add `host` header.
   * It returns `false` only if `host` header has been already provided.
   *
   * @returns True when the `host` header should be added to the
   * headers list.
   */
  _hostRequired(): boolean;

  /**
   * Alters authorization header depending on the `auth` object
   * @param headers A headers object where to append headers if
   * needed
   */
  _handleAuthorization(headers: ArcHeaders): void;

  /**
   * Alters authorization header depending on the `auth` object
   * @param headers A headers object where to append headers if
   */
  _handleLegacyAuth(headers: ArcHeaders, auth: LegacyAuth): void;

  /**
   * Authorize the request with NTLM
   * @param authData Credentials to use
   * @param headers A headers object where to append headers if
   * needed
   */
  _authorizeNtlm(authData: NtlmAuthorization|NtlmAuthLegacy, headers: ArcHeaders): void;

  /**
   * Add event listeners to existing socket.
   * @param socket An instance of the socket.
   * @returns The same socket. Used for chaining.
   */
  _addSocketListeners(socket: Socket): Socket;

  /**
   * Processes response message chunk
   * @param {Buffer} buffer Message buffer
   */
  _processResponse(buffer: Buffer): void;

  /**
   * Reports response after processing it.
   */
  _reportResponse(): void;

  /**
   * Handles the response with NTLM authorization
   */
  handleNtlmResponse(): void;

  /**
   * Process received message.
   *
   * @param data Received message.
   */
  _processSocketMessage(data: Buffer): void;

  /**
   * Read status line from the response.
   * This function will set `status` and `statusText` fields
   * and then will set `state` to HEADERS.
   *
   * @param data Received data
   */
  _processStatus(data: Buffer): Buffer;

  /**
   * Read headers from the received data.
   *
   * @param data Received data
   * @returns Remaining data in the buffer.
   */
  _processHeaders(data: Buffer): Buffer;

  /**
   * Check the response headers and end the request if nescesary.
   * @param data Current response data buffer
   */
  _postHeaders(data: Buffer): Buffer;

  /**
   * This function assumes that all headers has been read and it's
   * just before changing the ststaus to BODY.
   */
  _parseHeaders(array?: Buffer): void;

  /**
   * Sets the `_rawBody` property.
   *
   * @param data A data to process
   */
  _processBody(data: Buffer): void;

  /**
   * Sets the `_rawBody` property for a chunked response.
   *
   * @param data A latest data to process
   */
  _processBodyChunked(data: Buffer): void;

  /**
   * If response's Transfer-Encoding is 'chunked' read until next CR.
   * Everything before it is a chunk size.
   */
  readChunkSize(array: Buffer): Buffer;

  /**
   * Generate response object and publish it to the listeners.
   *
   * @param opts See #_createResponse for more info.
   */
  _publishResponse(opts: ResponsePublishOptions): Promise<void>;
}
