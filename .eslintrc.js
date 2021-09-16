module.exports = {
  extends: [
    require.resolve('eslint-config-google'),
    require.resolve('eslint-config-node'),
  ],
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 8,
  },
  env: {
    browser: true,
    mocha: true,
    node: true,
    es6: true,
  },
  plugins: ['no-only-tests', 'babel', 'import'],
  ignorePatterns: ['*.d.ts'],
  rules: {
    'arrow-parens': [
      'error',
      'always',
      {
        requireForBlockBody: true,
      },
    ],
    'arrow-body-style': ['error', 'as-needed'],
    'no-trailing-spaces': ['error', { skipBlankLines: true }],
    'lines-between-class-members': 'error',
    'no-underscore-dangle': 'off',
    'no-only-tests/no-only-tests': 'error',
    'import/extensions': [
      'error',
      'always',
      {
        ignorePackages: true,
      },
    ],
    'import/prefer-default-export': 'off',
    'import/no-nodejs-modules': 'off',
    'import/no-commonjs': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: ['**/test/**/*.js', '**/*.config.js', '**/*.conf.js'],
      },
    ],
    // this is unnecessary for node apps.
    'class-methods-use-this': 'off',
    'no-undef': 'error',
    'require-jsdoc': [
      'warn',
      {
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: true,
          FunctionExpression: true,
        },
      },
    ],
    'comma-dangle': 'warn',
    'new-cap': [
      'error',
      {
        properties: false,
        capIsNew: false,
      },
    ],
    'max-len': [
      'error',
      {
        code: 120,
      },
    ],
    'object-curly-spacing': ['error', 'always'],
    'no-console': ['error'],
    'no-unused-expressions': 'error',
    'babel/no-unused-expressions': 'error',
    'prefer-template': 'error',
    'no-return-await': 'error',
    'no-template-curly-in-string': 'error',
    'generator-star-spacing': 'off',
    'indent': ['error', 2, { SwitchCase: 1 }],
  },
  overrides: [
    {
      files: ['test/**/*.js'],
      rules: {
        'require-jsdoc': 'off',
        'no-empty-function': 'off',
        'no-console': 'off',
      },
    },
  ],
};
