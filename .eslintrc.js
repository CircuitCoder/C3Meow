module.exports = {
  root: true,
  extends: 'airbnb-base',
  // required to lint *.vue files
  plugins: [
    'html'
  ],
  // add your custom rules here
  'rules': {
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    'keyword-spacing': [2, {
      overrides: {
        if: { after: false },
        for: { after: false },
        while: { after: false },
        catch: { after: false },
      }
    }],
    'no-console': process.env.NODE_ENV === 'production' ? 2 : 1,
    'no-else-return': 0,
    'global-require': 0,
    'consistent-return': [2, {
      treatUndefinedAsUnspecified: true,
    }],
    curly: [2, 'multi'],
    'no-plusplus': 0,
    'no-restricted-syntax': 0,
    'arrow-parens': [2, 'as-needed'],
    'no-void': 0,

    'import/no-unresolved': 0,
    'import/first': 0,
  },
  env: {
    browser: true,
    node: true,
  }
}
