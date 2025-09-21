module.exports = {
  default: {
    require: [
      'features/step-definitions/**/*.ts',
      'features/support/**/*.ts'
    ],
    format: [
      '@cucumber/pretty-formatter',
      'json:reports/cucumber-report.json'
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    },
    paths: ['features/**/*.feature'],
    publishQuiet: true,
    failFast: false,
    retry: 2
  }
}
