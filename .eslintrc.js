module.exports = {
  "extends": "google",
  "parserOptions": {
    "sourceType": "module",
    "ecmaVersion": 8
  },
  "env": {
    "browser": true,
    "mocha": true,
    "node": true,
    "es6": true
  },
  "rules": {
    "max-len": ["error", {
      "code": 120
    }],
    "no-undef": "error",
    "require-jsdoc": 0,
    "comma-dangle": 0,
    'linebreak-style': 0
  }
};
