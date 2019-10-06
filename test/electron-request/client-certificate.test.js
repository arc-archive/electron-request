const server = require('../cert-auth-server');
const { ElectronRequest } = require('../../');
const fs = require('fs');
const { assert } = require('chai');

describe('ElectronRequest', function() {
  describe('Client certificate', () => {
    const httpPort = 8345;

    const requests = [{
      url: `https://localhost:${httpPort}/`,
      method: 'GET',
      headers: 'host: localhost',
      id: 'test1',
    }];

    const opts = [{
      timeout: 10000,
    }, {
      clientCertificate: {
        cert: {
          data: fs.readFileSync('./test/cert-auth-server/alice_cert.pem', 'utf8'),
        },
        key: {
          data: fs.readFileSync('./test/cert-auth-server/alice_key.pem', 'utf8'),
        },
        type: 'pem',
      },
    }, {
      clientCertificate: {
        // has to be buffer
        cert: {
          data: fs.readFileSync('./test/cert-auth-server/alice.p12'),
          passphrase: '',
        },
        type: 'p12',
      },
    }, {
      clientCertificate: {
        // has to be buffer
        cert: {
          data: fs.readFileSync('./test/cert-auth-server/alice-password.p12'),
          passphrase: 'test',
        },
        type: 'p12',
      },
    }, {
      clientCertificate: {
        // has to be buffer
        cert: {
          data: fs.readFileSync('./test/cert-auth-server/bob.p12'),
          passphrase: 'test',
        },
        type: 'p12',
      },
    }];

    before(async () => {
      await server.startServer(httpPort);
    });

    after(async () => {
      await server.stopServer();
    });

    it('makes connection without certificate', (done) => {
      const request = new ElectronRequest(requests[0], opts[0]);
      request.once('load', (id, response) => {
        const payloadString = response.payload.toString();
        const payload = JSON.parse(payloadString);
        assert.isFalse(payload.authenticated);
        done();
      });
      request.once('error', (e) => {
        done(e);
      });
      request.send().catch((e) => done(e));
    });

    it('makes a connection with p12 client certificate', (done) => {
      const request = new ElectronRequest(requests[0], opts[2]);
      request.once('load', (id, response) => {
        const payloadString = response.payload.toString();
        const payload = JSON.parse(payloadString);
        assert.isTrue(payload.authenticated);
        assert.equal(payload.name, 'Alice');
        assert.equal(payload.issuer, 'localhost');
        done();
      });
      request.once('error', (e) => {
        done(e);
      });
      request.send().catch((e) => done(e));
    });

    it('makes a connection with p12 client certificate and password', (done) => {
      const request = new ElectronRequest(requests[0], opts[3]);
      request.once('load', (id, response) => {
        const payloadString = response.payload.toString();
        const payload = JSON.parse(payloadString);
        assert.isTrue(payload.authenticated);
        assert.equal(payload.name, 'Alice');
        assert.equal(payload.issuer, 'localhost');
        done();
      });
      request.once('error', (e) => {
        done(e);
      });
      request.send().catch((e) => done(e));
    });

    it('ignores untrusted valid certificates', (done) => {
      const request = new ElectronRequest(requests[0], opts[4]);
      request.once('load', (id, response) => {
        const payloadString = response.payload.toString();
        const payload = JSON.parse(payloadString);
        assert.isFalse(payload.authenticated);
        assert.equal(payload.name, 'Bob');
        // Bob has self-signed cert
        assert.equal(payload.issuer, 'Bob');
        done();
      });
      request.once('error', (e) => {
        done(e);
      });
      request.send().catch((e) => done(e));
    });

    it('makes a connection with pem client certificate', (done) => {
      const request = new ElectronRequest(requests[0], opts[1]);
      request.once('load', (id, response) => {
        const payloadString = response.payload.toString();
        const payload = JSON.parse(payloadString);
        assert.isTrue(payload.authenticated);
        assert.equal(payload.name, 'Alice');
        assert.equal(payload.issuer, 'localhost');
        done();
      });
      request.once('error', (e) => {
        done(e);
      });
      request.send().catch((e) => done(e));
    });
  });
});
