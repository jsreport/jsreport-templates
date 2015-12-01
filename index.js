var main = require('./lib/templates.js')
var config = require('jsreport.config.js')()

module.exports = function (options) {
  config.options = options
  config.main = main
  return config
}
