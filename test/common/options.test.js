const {RequestOptions} = require('../../lib/request-options');
const assert = require('chai').assert;

describe('RequestOptions', function() {
  describe('validateOptions()', () => {
    describe('_validateOptionsList()', () => {
      it('Will not set warning for valid options', function() {
        const options = new RequestOptions();
        options._validateOptionsList({
          validateCertificates: false,
          followRedirects: false,
          timeout: 20,
          logger: console,
          hosts: [{from: 'a', to: 'b'}],
          sentMessageLimit: 12
        });
        assert.lengthOf(options.validationWarnings, 0);
      });

      it('Sets warning for type missmatch', function() {
        const options = new RequestOptions();
        options._validateOptionsList({
          validateCertificates: 'false'
        });
        assert.lengthOf(options.validationWarnings, 1);
      });

      it('Ignores "undefined" missmatch', function() {
        const options = new RequestOptions();
        options._validateOptionsList({
          sentMessageLimit: undefined
        });
        assert.lengthOf(options.validationWarnings, 0);
      });

      it('Sets default value for type missmatch', function() {
        const options = new RequestOptions();
        options._validateOptionsList({
          validateCertificates: 'false'
        });
        assert.isFalse(options.validateCertificates);
      });

      it('Sets warning for unknown property', function() {
        const options = new RequestOptions();
        options._validateOptionsList({
          unknown: 1
        });
        assert.lengthOf(options.validationWarnings, 1);
      });

      it('Removes unknown property', function() {
        const options = new RequestOptions();
        options._validateOptionsList({
          unknown: 1
        });
        assert.isUndefined(options.options);
      });
    });

    describe('_validateLogger()', () => {
      it('Should set warning for invalid object', function() {
        const options = new RequestOptions({
          logger: {}
        });
        assert.lengthOf(options.validationWarnings, 1);
      });

      it('Should set warning when missing info method', function() {
        const options = new RequestOptions({
          logger: {
            log: function() {},
            warning: function() {},
            error: function() {}
          }
        });
        assert.lengthOf(options.validationWarnings, 1);
      });

      it('Should set warning when missing log method', function() {
        const options = new RequestOptions({
          logger: {
            info: function() {},
            warning: function() {},
            error: function() {}
          }
        });
        assert.lengthOf(options.validationWarnings, 1);
      });

      it('Should set warning when missing warning method', function() {
        const options = new RequestOptions({
          logger: {
            info: function() {},
            log: function() {},
            error: function() {}
          }
        });
        assert.lengthOf(options.validationWarnings, 1);
      });

      it('Should set warning when missing error method', function() {
        const options = new RequestOptions({
          logger: {
            info: function() {},
            log: function() {},
            warning: function() {}
          }
        });
        assert.lengthOf(options.validationWarnings, 1);
      });

      it('Should not set warning when walid', function() {
        const options = new RequestOptions({
          logger: {
            info: function() {},
            log: function() {},
            warn: function() {},
            error: function() {}
          }
        });
        assert.lengthOf(options.validationWarnings, 0);
      });
    });
  });

  describe('_validateMessageLimit()', () => {
    it('Adds warning for negative messsage limit', () => {
      const options = new RequestOptions({
        sentMessageLimit: -1
      });
      assert.lengthOf(options.validationWarnings, 1);
    });

    it('Sets default message limit', () => {
      const options = new RequestOptions({
        sentMessageLimit: -1
      });
      assert.equal(options.sentMessageLimit, 2048);
    });

    it('Respects 0 value', () => {
      const options = new RequestOptions({
        sentMessageLimit: 0
      });
      assert.equal(options.sentMessageLimit, 0);
    });
  });

  describe('_setDefaults()', () => {
    let options;

    before(function() {
      options = new RequestOptions();
    });

    it('validateCertificates is false', function() {
      assert.isFalse(options.validateCertificates);
    });

    it('followRedirects is true', function() {
      assert.isTrue(options.followRedirects);
    });

    it('sentMessageLimit is set', function() {
      assert.equal(options.sentMessageLimit, 2048);
    });
  });
});
