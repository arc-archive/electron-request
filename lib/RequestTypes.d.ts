// export interface NtlmAuthLegacy {
//   domain: string;
//   username: string;
//   password?: string;
//   url?: string;
//   method: string;
// }

// export interface BasicAuthLegacy {
//   username: string;
//   password?: string;
//   method: string;
// }

// /**
//  * A configuration for the legacy ARC auth object on the request.
//  * This object has been replaced in Q1 2020 wit OAS3 support release.
//  */
// export interface LegacyAuth extends NtlmAuthLegacy, BasicAuthLegacy {
//   type: string;
// }

// export interface BasicAuthorization {
//   /**
//    * User name value.
//    */
//   username?: string;
//   /**
//    * User password value.
//    */
//   password?: string;
// }

// export interface BearerAuthorization {
//   /**
//    * Bearer token value
//    */
//   token: string;
// }
// export interface NtlmAuthorization {
//   /**
//    * User name value.
//    */
//   username?: string;
//   /**
//    * User password value.
//    */
//   password?: string;
//   /**
//    * Authorization domain
//    */
//   domain: string;
// }
// export interface DigestAuthorization {
//   username?: string;
//   password?: string;
//   realm: string;
//   nonce: string;
//   uri: string;
//   qop: string;
//   opaque: string;
//   response: string;
//   nc: string|number;
//   cnonce: string;
//   algorithm: string;
// }
// export interface OAuth1Authorization {
//   consumerKey: string;
//   consumerSecret: string;
//   token: string;
//   tokenSecret: string;
//   timestamp: string|number;
//   nonce: string;
//   realm: string;
//   signatureMethod: string;
//   requestTokenUri: string;
//   accessTokenUri: string;
//   redirectUri: string;
//   authParamsLocation: string;
//   authTokenMethod: string;
//   authorizationUri: string;
//   type: string;
// }

// export interface OAuth2Authorization {
//   /**
//    * OAuth 2 grant type
//    */
//   grantType: string;
//   /**
//    * The same as `grantType`, used for compatibility.
//    */
//   type: string;
//   /**
//    * Registered client ID
//    */
//   clientId?: string;
//   /**
//    * Registered client secret
//    */
//   clientSecret?: string;
//   /**
//    * Current access token
//    */
//   accessToken?: string;
//   /**
//    * List of token scopes.
//    */
//   scopes?: string;
//   /**
//    * User password value
//    */
//   password?: string;
//   /**
//    * User name value
//    */
//   username?: string;
//   /**
//    * User authorization URI
//    */
//   authorizationUri?: string;
//   /**
//    * Token exchange URI
//    */
//   accessTokenUri?: string;
//   /**
//    * Generated state parameter for current request
//    */
//   state?: string;
// }

// /**
//  * ARC request `config` object.
//  */
// export declare interface RequestConfig {
//   /**
//    * The request timeout.
//    * Default no timeout.
//    */
//   timeout?: boolean;
//   /**
//    * Whether or not the request should follow redirects.
//    */
//   followRedirects?: boolean;
//   /**
//    * Hosts table configuration.
//    */
//   hosts?: HostRule;
// }

// /**
//  * Definition of the ARC request object.
//  */
// export declare interface ArcRequest {
//   /**
//    * The ID of the request.
//    */
//   id: string;
//   /**
//    * Request processing configuration.
//    */
//   config?: RequestConfig;
//   /**
//    * The HTTP method (verb)
//    */
//   method: string;
//   /**
//    * The request URL
//    */
//   url: string;
//   /**
//    * Added by the request engine.
//    * The actual message sent to the server.
//    */
//   sentHttpMessage?: string;
//   /**
//    * Request headers
//    */
//   headers?: string;
//   /**
//    * Payload message to send with the request
//    */
//   payload?: string|FormData|Blob|File|Buffer;
//   /**
//    * Authorization configuration
//    */
//   auth?: LegacyAuth|BasicAuthorization|BearerAuthorization|NtlmAuthorization|DigestAuthorization|OAuth1Authorization|OAuth2Authorization;
//   /**
//    * Authorization type
//    */
//   authType?: string;
// }

// export declare interface CertificateData {
//   /**
//    * The certificate to use.
//    * The `p12` type certificate must be a `Buffer`.
//    */
//   data: string|Buffer;
//   /**
//    * A passphrase to use to unlock the certificate.
//    */
//   passphrase?: string;
// }

// export declare interface ArcCertificate {
//   /**
//    * Type of the certificate, either `p12` or `pem`
//    */
//   type: string;
//   /**
//    * The certificate to use
//    */
//   cert: CertificateData|CertificateData[];
//   /**
//    * The key for `pem` certificate.
//    */
//   key: CertificateData|CertificateData[];
// }
// /**
//  * ARC host rule definition.
//  */
// export declare interface HostRule {
//   /**
//    * The from rule (may contain asterisks)
//    */
//   from: string;
//   /**
//    * replacement value
//    */
//   to: string;
//   /**
//    * if false the rule is ignored
//    */
//   enabled?: boolean;
//   /**
//    * optional rule description
//    */
//   comment?: string;
// }

export declare interface ArcSocketResponse {
  status: number;
  statusText: string;
  headers: string;
  payload: Buffer;
}

export declare interface RequestStats {
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

// export declare interface RequestTimings {
//   connect: number;
//   receive: number
//   send: number
//   wait: number
//   dns: number
//   ssl?: number
// }

// export declare interface ArcResponse {
//   /**
//    * Determines whether the response has an error.
//    */
//   isError?: boolean;
//   /**
//    * An error associated with the response
//    */
//   error?: Error;
//   /**
//    * The time the entire request and response took.
//    */
//   loadingTime?: number;
//   /**
//    *  The original request object
//    */
//   request?: ArcRequest;
//   /**
//    * Response data
//    */
//   response?: ArcSocketResponse;
//   /**
//    * Sent to the server message, as string.
//    */
//   sentHttpMessage: string;
//   /**
//    * List of response objects, in order of redirection.
//    */
//   redirects?: ArcResponse[];
//   /**
//    * List of timings for redirects in order
//    */
//   redirectsTiming?: RequestTimings[];
//   /**
//    * The detailed timing of a request.
//    * A HAR 1.2 timing object
//    */
//   timing?: RequestTimings;
// }

export declare interface ResponsePublishOptions {
  /**
   * If true the response will have information about redirects.
   */
  includeRedirects?: boolean;
  /**
   * An error object when the response error.
   */
  error?: Error;
}
