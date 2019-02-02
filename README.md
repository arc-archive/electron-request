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

## Running tests

You need [Docker](https://www.docker.com/products/docker-desktop) to run the test as they uses `kennethreitz/httpbin` image.

Run this command to download the image:

```
docker pull kennethreitz/httpbin
```

Then run the image:
```
docker run -d -p 80:80 kennethreitz/httpbin
```

Check if instance is running:

```
docker ps -a
```

This should print something like:

```
CONTAINER ID        IMAGE                      COMMAND                  CREATED             STATUS           PORTS                NAMES
e4bb74785018        kennethreitz/httpbin       "gunicorn -b 0.0.0.0…"   8 seconds ago       Up 6 seconds     0.0.0.0:80->80/tcp   condescending_kalam
```

Run the tests:

```
npm test
```

Finally kill the pod:

```
docker stop e4bb74785018
```
