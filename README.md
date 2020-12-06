# Electron request

The HTTP engine for the Advanced REST Client application.

It works in the Electron's renderer process and allows to make a HTTP request resulting with detailed response.

The detailed response contains information about redirects and timings similar to the ones presented by Chrome Dev Tools.

## Usage

The library contain two HTTP clients:

- `SocketRequest` - ARC's original and own HTTP client. Operates directly on the socket.
- `ElectronRequest` - A request engine using higher level Node's APIs

Both classes use the same configuration and produce the same output.

### Installation

```sh
npm i -S @advanced-rest-client/electron-request
```

### Socket request

Originally `SocketRequest` was develop for ARC Chrome Application as Chrome apps don't have access to low level request APIs and therefore the application was unable to produce detailed information about the request.

```javascript
import { SocketRequest } from '@advanced-rest-client/electron-request';

const opts = {
  timeout: 30000,
  hosts: [{from: 'domain.com', to: 'other.com'}],
  followRedirects: true
};

const request = {
  id: 'some-id',
  url: 'http://api.domain.com',
  method: 'GET',
  headers: 'x-test: true'
};

const connection = new SocketRequest(request, opts);
request.on('load', (response, request) => {});
request.on('error', (error) => {});
try {
  await connection.send();
  console.log('Request message sent.');
} catch (cause) {
  // usually it means that the server is down or configuration is invalid (URL).
  console.error('Connection error', cause);
}
```

### Native request

Electron application can access Node's APIs and therefore `SocketRequest` can be eventually replaced to reduce amount of code to maintain.

```javascript
import { ElectronRequest } from '@advanced-rest-client/electron-request';

const opts = {
  timeout: 30000,
  hosts: [{from: 'domain.com', to: 'other.com'}],
  followRedirects: true
};

const request = {
  id: 'some-id',
  url: 'http://api.domain.com',
  method: 'GET',
  headers: 'x-test: true'
};

const connection = new ElectronRequest(request, opts);
request.on('load', (id, response, request) => {});
request.on('error', (error, id) => {});
try {
  await connection.send();
  console.log('Request message sent.');
} catch (cause) {
  // usually it means that the server is down or configuration is invalid (URL).
  console.error('Connection error', cause);
}
```

## Running tests

Run the tests:

```sh
npm test
```
