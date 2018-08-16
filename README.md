# Electron request

A HTTP client for Advanced REST client.

It works in the renderer process and allows to make a HTTP request resulting
with detailed response.

The detailed response contains information about redirects and timings similar to ones presented by Chrome Dev Tools.

## Usage

```javascript
const {SocketRequest} = require('@advanced-rest-client/electron-request');

const opts = {
  timeout: 30000,
  hosts: [{from: 'domain.com', to: 'other.com'}],
  followRedirects: true
};

const request = {
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
