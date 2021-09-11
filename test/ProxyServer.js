const getPort = require('get-port');
const http = require('http');
const https = require('https');
const net = require('net');
const path = require('path');
const fs = require('fs-extra');
const { URL } = require('url');

/** @typedef {import('net').Socket} Socket */

class ProxyServer {
  #requestHandler;

  #connectionHandler;

  #connectHandler;

  constructor() {
    /** @type number */
    this.httpPort = undefined;
    /** @type number */
    this.httpsPort = undefined;
    this.httpServer = undefined;
    this.httpsServer = undefined;
    /** @type Record<number, Socket> */
    this.socketMap = {};
    this.lastSocketKey = 0;
    this.#requestHandler = this.#requestCallback.bind(this);
    this.#connectionHandler = this.#connectionCallback.bind(this);
    this.#connectHandler = this.#connectCallback.bind(this);
  }

  async start() {
    await this.startHttp();
    await this.startHttps();
  }

  async stop() {
    this.disconnectAll();
    await this.stopHttp();
    await this.stopHttps();
  }

  async startHttp() {
    this.httpPort = await getPort({ port: getPort.makeRange(8000, 8100) });
    this.httpServer = http.createServer(); // (this.#requestHandler);
    this.httpServer.on('connection', this.#connectionHandler); // -> this.#connectionCallback
    this.httpServer.on('connect', this.#connectHandler); // -> this.#connectCallback
    this.httpServer.on('request', this.#requestHandler); // -> this.#requestCallback
    return new Promise((resolve) => {
      this.httpServer.listen(this.httpPort, () => resolve());
    });
  }

  async startHttps() {
    this.httpsPort = await getPort({ port: getPort.makeRange(8000, 8100) });
    const key = await fs.readFile(path.join('test', 'certs', 'privkey.pem'));
    const cert = await fs.readFile(path.join('test', 'certs', 'fullchain.pem'));
    return new Promise((resolve) => {
      const options = {
        key,
        cert,
      };
      this.httpsServer = https.createServer(options); // (options, this.#requestHandler);
      this.httpsServer.listen(this.httpsPort, () => resolve());
      this.httpsServer.on('connection', this.#connectionHandler); // -> this.#connectionCallback
      this.httpsServer.on('connect', this.#connectHandler); // -> this.#connectCallback
      this.httpsServer.on('request', this.#requestHandler); // -> this.#requestCallback
    });
  }

  async stopHttp() {
    return new Promise((resolve) => {
      this.httpServer.close(() => resolve());
    });
  }

  async stopHttps() {
    return new Promise((resolve) => {
      this.httpsServer.close(() => resolve());
    });
  }

  disconnectAll() {
    const { socketMap } = this;
    Object.keys(socketMap).forEach((socketKey) => {
      if (socketMap[socketKey].destroyed) {
        return;
      }
      socketMap[socketKey].destroy();
    });
  }

  /**
   * Callback for client connection.
   *
   * @param {http.IncomingMessage} req Node's request object
   * @param {http.ServerResponse} res Node's response object
   */
  #requestCallback(req, res) {
    if (req.method === 'CONNECT') {
      res.writeHead(500, {
        'Content-Type': 'application/json',
      });
      res.write(JSON.stringify({ error: 'should not handle this path.' }));
      res.end();
    } else {
      this.#proxy(req, res);
    }
  }

  /**
   * @param {http.IncomingMessage} request
   * @param {Socket} clientSocket
   * @param {Buffer} head
   */
  #connectCallback(request, clientSocket, head) {
    const { port, hostname } = new URL(`https://${request.url}`);
    const serverSocket = net.connect(Number(port || 443), hostname, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                    'Proxy-agent: Test-Server\r\n' +
                    '\r\n');
      serverSocket.write(head);
      serverSocket.pipe(clientSocket);
      clientSocket.pipe(serverSocket);
      serverSocket.once('end', () => {
        clientSocket.destroy();
        serverSocket.destroy();
      });
    });
    serverSocket.setKeepAlive(false);
  }

  /**
   * Caches sockets after connection.
   * @param {Socket} socket
   */
  #connectionCallback(socket) {
    const socketKey = ++this.lastSocketKey;
    this.socketMap[socketKey] = socket;
    // socket.on('connect', () => {
    //   console.log('SOCKET CONNECT');
    // });
    // socket.on('ready', () => {
    //   console.log('SOCKET READY');
    // });
    // socket.on('end', () => {
    //   console.log('SOCKET END');
    // });
    // socket.on('error', () => {
    //   console.log('SOCKET ERROR');
    // });
    // socket.on('lookup', () => {
    //   console.log('SOCKET LOOKUP');
    // });
    // socket.on('data', (data) => {
    //   console.log('SOCKET DATA', data.toString('utf8'));
    // });
    // socket.on('drain', () => {
    //   console.log('SOCKET DRAIN');
    // });
    // socket.on('timeout', () => {
    //   console.log('SOCKET TIMEOUT');
    // });
    socket.on('close', () => {
      delete this.socketMap[socketKey];
    });
  }

  /**
   * Proxies streams.
   *
   * @param {http.IncomingMessage} req Node's request object
   * @param {http.ServerResponse} res Node's response object
   */
  #proxy(req, res) {
    const isSsl = req.url.startsWith('https:');
    const isHttp = req.url.startsWith('http:');
    if (!isSsl && !isHttp) {
      res.writeHead(400, {
        'Content-Type': 'application/json',
      });
      res.write(JSON.stringify({ error: 'the destination URL has no scheme' }));
      res.end();
      return;
    }
    if (isSsl) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.write(JSON.stringify({ error: 'Invalid request. Use tunneling instead.' }));
      res.end();
    } else {
      this.#proxyHttp(req, res);
    }
  }

  /**
   * @param {http.IncomingHttpHeaders} incoming
   * @return {http.OutgoingHttpHeaders}
   */
  #prepareHeaders(incoming) {
    const result = /** @type http.OutgoingHttpHeaders */ ({});
    const keys = Object.keys(incoming);
    const ignored = /** @type {(keyof http.IncomingHttpHeaders)[]} */ ([
      'proxy-authorization',
    ]);
    keys.forEach((key) => {
      const name = key.toLowerCase();
      if (ignored.includes(name)) {
        return;
      }
      result[key] = incoming[key];
    });
    return result;
  }

  /**
   * Proxies http streams.
   *
   * @param {http.IncomingMessage} sourceRequest Node's request object
   * @param {http.ServerResponse} sourceResponse Node's response object
   */
  #proxyHttp(sourceRequest, sourceResponse) {
    const urlInfo = new URL(sourceRequest.url);
    const headers = this.#prepareHeaders(sourceRequest.headers);
    const options = /** @type http.RequestOptions */ ({
      method: sourceRequest.method,
      host: urlInfo.host,
      hostname: urlInfo.hostname,
      path: `${urlInfo.pathname}${urlInfo.search || ''}`,
      port: urlInfo.port || 80,
      protocol: urlInfo.protocol,
      headers,
    });
    const proxy = http.request(options, (targetResponse) => {
      sourceResponse.statusCode = targetResponse.statusCode;
      if (targetResponse.statusMessage) {
        sourceResponse.statusMessage = targetResponse.statusMessage;
      }
      for (let i = 0, len = targetResponse.rawHeaders.length; i < len; i+=2) {
        const name = targetResponse.rawHeaders[i];
        const value = targetResponse.rawHeaders[i + 1];
        sourceResponse.setHeader(name, value);
      }
      targetResponse.on('data', (data) => {
        sourceResponse.write(data);
      });
      targetResponse.on('end', () => {
        sourceResponse.end();
      });
    });
    sourceRequest.on('data', (data) => {
      proxy.write(data);
    });
    if (sourceRequest.readableEnded) {
      proxy.end();
    } else {
      sourceRequest.once('end', () => {
        proxy.end();
      });
    }
    proxy.on('error', (err) => {
      // @ts-ignore
      if (err.code === 'ENOTFOUND') {
        sourceResponse.writeHead(404);
        sourceResponse.end();
      } else {
        sourceResponse.writeHead(500);
        sourceResponse.end();
      }
    });
  }
}

module.exports = ProxyServer;
