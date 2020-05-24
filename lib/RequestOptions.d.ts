import { HostRule, ArcCertificate } from './RequestTypes';

export declare interface Logger {
  warn: Function;
  info: Function;
  error: Function;
  log: Function;
  debug: Function;
}

/**
 * ARC request options.
 */
export declare interface Options {
  /**
   * When set it validates certificates during request.
   */
  validateCertificates?: boolean;
  /**
   * When false the request object won't follow redirects.
   */
  followRedirects?: boolean;
  /**
   * Request timeout in milliseconds
   * @type {number?}
   */
  timeout?: number;
  /**
   * Logger object.
   */
  logger?: Logger;
  /**
   * Hosts table.
   */
  hosts?: HostRule[];
  /**
   * A limit of characters to include into the `sentHttpMessage` property
   * of the request object. 0 to disable limit. Default to 2048.
   */
  sentMessageLimit?: number;
  /**
   * When set the request adds `accept` and `user-agent` headers if missing.
   */
  defaultHeaders?: boolean;
  /**
   * Default `user-agent` header to be used with request when `defaultHeaders`
   * is set.
   *
   * @default advanced-rest-client
   */
  defaultUserAgent?: string;
  /**
   * Default `accept` header to be used with request when `defaultHeaders`
   * is set.
   * @default *\/*
   */
  defaulAccept?: string;
  /**
   * A certificate to use with the request.
   */
  clientCertificate?: ArcCertificate;
}

/**
 * ARC request options processing class.
 */
export declare class RequestOptions {
  validationWarnings?: string[];

  /**
   * When set it validates certificates during request.
   */
  validateCertificates?: boolean;
  /**
   * When false the request object won't follow redirects.
   */
  followRedirects?: boolean;
  /**
   * Request timeout in milliseconds
   * @type {number?}
   */
  timeout?: number;
  /**
   * Logger object.
   */
  logger?: Logger;
  /**
   * Hosts table.
   */
  hosts?: HostRule[];
  /**
   * A limit of characters to include into the `sentHttpMessage` property
   * of the request object. 0 to disable limit. Default to 2048.
   */
  sentMessageLimit?: number;
  /**
   * When set the request adds `accept` and `user-agent` headers if missing.
   */
  defaultHeaders?: boolean;
  /**
   * Default `user-agent` header to be used with request when `defaultHeaders`
   * is set.
   *
   * @default advanced-rest-client
   */
  defaultUserAgent?: string;
  /**
   * Default `accept` header to be used with request when `defaultHeaders`
   * is set.
   * @default *\/*
   */
  defaulAccept?: string;
  /**
   * A certificate to use with the request.
   */
  clientCertificate?: ArcCertificate;

  /**
   * Map of options with data types
   */
  readonly validOptions?: Object;

  constructor(opts?: Options);

  /**
   * Processes user options. Removes options that has type misspatch.
   * @param opts User options
   * @returns Processed options.
   */
  processOptions(opts: Options): object;

  /**
   * Validates user input options.
   * Sets `_validationErrors` and `_validationWarnings` arrays on this object
   * conteining corresponing messages.
   *
   * @param userOpts User options to check.
   */
  validateOptions(userOpts: Options): void;

  /**
   * Validates passed user options for data type and names.
   * @param userOpts
   */
  _validateOptionsList(userOpts: Options): void;

  /**
   * Validates user option for the `logger` property.
   *
   * @param userOpts Passed user options.
   */
  _validateLogger(userOpts: Options): void;

  /**
   * Validates user option for the `logger` property.
   *
   * @param opts Passed user options.
   */
  _validateMessageLimit(opts: Options): void

  /**
   * Validates `clientCertificate` value.
   * @param opts Passed user options.
   */
  _validateCertificate(opts: Options): void

  /**
   * Creates default values for passed options.
   */
  _setDefaults(opts: Options): Options
}
