const assert = require('chai').assert;
const {HostRulesEval} = require('../lib/hosts-eval');

describe('HostRulesEval tests', function() {
  describe('_createRuleRe()', function() {
    it('Creates a regular expression', () => {
      const result = HostRulesEval._createRuleRe('test');
      assert.typeOf(result, 'RegExp');
    });

    it('Expression is based on the input', () => {
      const input = 'test-input';
      const result = HostRulesEval._createRuleRe(input);
      assert.equal(result.source, input);
    });

    it('Replaces asterix with regular expression group input', () => {
      const result = HostRulesEval._createRuleRe('test*input');
      assert.equal(result.source, 'test(.*)input');
    });

    it('Replaces asterixes globally', () => {
      const result = HostRulesEval._createRuleRe('test*input*');
      assert.equal(result.source, 'test(.*)input(.*)');
    });
  });

  describe('_evaluateRule()', function() {
    it('Returns undefined when rule is not defuned', function() {
      const url = 'test';
      assert.isUndefined(HostRulesEval._evaluateRule(url));
      assert.isUndefined(HostRulesEval._evaluateRule(url, {}));
      assert.isUndefined(HostRulesEval._evaluateRule(url, {from: 'from'}));
      assert.isUndefined(HostRulesEval._evaluateRule(url, {to: 'to'}));
    });

    it('Returns undefined if the rule does not match', function() {
      const url = 'abc';
      const rule = {
        from: 'xyz',
        to: 'test'
      };
      assert.isUndefined(HostRulesEval._evaluateRule(url, rule));
    });

    it('Alters the url', function() {
      const url = 'abc';
      const rule = {
        from: 'a',
        to: 'test'
      };
      const result = HostRulesEval._evaluateRule(url, rule);
      assert.equal(result, 'testbc');
    });

    it('Alters the url globally', function() {
      const url = 'abca';
      const rule = {
        from: 'a',
        to: 'test'
      };
      const result = HostRulesEval._evaluateRule(url, rule);
      assert.equal(result, 'testbctest');
    });

    it('Includes asterics', function() {
      const url = 'abca';
      const rule = {
        from: 'abc*',
        to: 'test'
      };
      const result = HostRulesEval._evaluateRule(url, rule);
      assert.equal(result, 'test');
    });

    [
      ['https://api.domain.com/api', 'https://test.domain.com/api', {from: 'api.domain.com', to: 'test.domain.com'}],
      ['https://api.domain.com/api', 'https://test.domain.com/api', {from: 'api.*.com', to: 'test.domain.com'}],
      ['https://a123.domain.com/api', 'https://test.domain.com/api', {from: 'a(\\d+)', to: 'test'}],
      ['https://a123.domain.com/api', 'https://secured/api', {from: 'https://*/', to: 'https://secured/'}],
      ['https://var.domain.com/var', 'https://abc.domain.com/abc', {from: 'var', to: 'abc'}]
    ].forEach((item, index) => {
      it(`Evaluates test #${index}`, function() {
        const result = HostRulesEval._evaluateRule(item[0], item[2]);
        assert.equal(result, item[1]);
      });
    });
  });

  describe('applyHosts()', function() {
    const url = 'https://api.host.domain.com/path?query=param';
    it('Returns the URL if there is no rules', () => {
      assert.equal(HostRulesEval.applyHosts(url), url);
    });

    it('Returns the URL if rules is empty', () => {
      assert.equal(HostRulesEval.applyHosts(url, []), url);
    });

    it('Alters the URL by all rules', () => {
      const rules = [{
        from: 'https:',
        to: 'ftp:'
      }, {
        from: '/api\\.',
        to: '/0.'
      }, {
        from: '\\.host\\.',
        to: '.'
      }, {
        from: '/path',
        to: '/api'
      }, {
        from: 'query=param',
        to: 'a=b'
      }];
      const result = HostRulesEval.applyHosts(url, rules);
      assert.equal(result, 'ftp://0.domain.com/api?a=b');
    });
  });
});
