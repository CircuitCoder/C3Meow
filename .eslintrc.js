module.exports = {
  root: true,
  extends: 'airbnb-base',
  // required to lint *.vue files
  plugins: [
    'html'
  ],
  // add your custom rules here
  'rules': {
    'import/no-unresolved': 0,
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
    'no-console': process.env.NODE_ENV === 'production' ? 1 : 1,
    'no-else-return': 0,
    'global-require': 0,
    'consistent-return': [2, {
      treatUndefinedAsUnspecified: true,
    }],
  }
}
