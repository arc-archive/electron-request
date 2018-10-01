# Electron request

A HTTP client for Advanced REST client.

It works in the renderer process and allows to make a HTTP request resulting
with detailed response.

The detailed response contains information about redirects and timings similar
to the ones presented by Chrome Dev Tools.

## Socket request

### Usage

```javascript
const {SocketRequest} = require('@advanced-rest-client/electron-request');

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
connection.send()
.then(() => {
  console.log('Request message sent.');
})
.catch((cause) => {
  console.error('Connection error');
});
```

## Native request

### Usage

```javascript
const {ElectronRequest} = require('@advanced-rest-client/electron-request');

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
connection.send()
.then(() => {
  console.log('Request message sent.');
})
.catch((cause) => {
  console.error('Connection error');
});
```

## Options

### `validateCertificates`

When set it validates certificates during request.

### `followRedirects`

When false the request object won't follow redirects.

### `timeout`

Request timeout in milliseconds

### `logger`

Logger object. If not set is uses `electron-log`

### `hosts`

Hosts table. Each rule must have `from` and `to` properties.

### `sentMessageLimit`

A limit of characters to include into the `sentHttpMessage` property of the request object. 0 to disable limit. Default to 2048.
