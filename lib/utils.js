const url = require('url');
/**
 * A class containing only static members to contain multi-module
 * helper methods.
 */
class RequestUtils {
  /**
   * Reads a port number for a connection.
   *
   * @param {?Number} port Existing information abour port.
   * @param {?String} protocol Request protocol. Only used if `port` is not set.
   * @return {Number} A port number. Default to 80.
   */
  static getPort(port, protocol) {
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
   * Creates a value for host header.
   *
   * @param {String} value An url to get the information from.
   * @return {String} Value of the host header
   */
  static getHostHeader(value) {
    const uri = url.parse(value);
    let hostValue = uri.hostname;
    const defaultPorts = [80, 443];
    const port = RequestUtils.getPort(uri.port, uri.protocol);
    if (defaultPorts.indexOf(port) === -1) {
      hostValue += ':' + port;
    }
    return hostValue;
  }
}
module.exports.RequestUtils = RequestUtils;
