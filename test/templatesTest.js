var path = require('path')
var assert = require('assert')
var JsReport = require('jsreport-core')

describe('templating', function () {
  var jsreport

  beforeEach(function () {
    jsreport = new JsReport({
      rootDirectory: path.join(__dirname, '../')
    })

    return jsreport.init()
  })

  it('handleBefore should find by _id and use template', function () {
    var request = {
      template: {},
      logger: jsreport.logger,
      context: jsreport.context,
      options: {recipe: 'html'}
    }

    return jsreport.documentStore.collection('templates').insert({content: 'foo'}).then(function (t) {
      request.template._id = t._id
      return jsreport.templates.handleBeforeRender(request, {}).then(function () {
        assert.equal('foo', request.template.content)
      })
    })
  })

  it('should callback weak error when missing template', function () {
    var request = {
      template: {_id: '507f191e810c19729de860ea'},
      logger: jsreport.logger,
      context: jsreport.context,
      options: {recipe: 'html'}
    }

    var response = {}

    return jsreport.templates.handleBeforeRender(request, response).catch(function (err) {
      assert.equal(err.weak, true)
    })
  })

  it('handleBefore should find by shortid and use template', function () {
    var request = {
      template: {},
      logger: jsreport.logger,
      context: jsreport.context,
      options: {recipe: 'html'}
    }

    return jsreport.documentStore.collection('templates').insert({content: 'foo'}).then(function (t) {
      request.template.shortid = t.shortid
      return jsreport.templates.handleBeforeRender(request, {}).then(function () {
        assert.equal('foo', request.template.content)
      })
    })
  })

  it('handleBefore should find by name and use template', function () {
    var request = {
      template: {name: 'x'},
      logger: jsreport.logger,
      context: jsreport.context,
      options: {recipe: 'html'}
    }

    return jsreport.documentStore.collection('templates').insert({content: 'foo', name: 'x'}).then(function (t) {
      return jsreport.templates.handleBeforeRender(request, {}).then(function () {
        assert.equal('foo', request.template.content)
      })
    })
  })

  it('handleBefore with content and not existing name should pass', function () {
    var request = {
      template: {name: 'x', content: ' '},
      logger: jsreport.logger,
      context: jsreport.context,
      options: {recipe: 'html'}
    }

    return jsreport.templates.handleBeforeRender(request, {}).then(function () {
      assert.equal(' ', request.template.content)
    })
  })

  it('handleBefore with not existing template should fail requesting handleBefore second time with existing template should succeed', function () {
    var request = {
      template: {},
      context: jsreport.context,
      logger: jsreport.logger,
      options: {recipe: 'html'}
    }

    return jsreport.documentStore.collection('templates').insert({content: 'foo'}).then(function (t) {
      request.template.shortid = 'not existing'

      return jsreport.templates.handleBeforeRender(request, {}).catch(function () {
        request = {
          template: {shortid: t.shortid},
          logger: jsreport.logger,
          context: jsreport.context,
          options: {recipe: 'html'}
        }

        return jsreport.templates.handleBeforeRender(request, {}).then(function () {
          assert.equal('foo', request.template.content)
        })
      })
    })
  })

  it('handleBefore should throw when no content and id specified', function () {
    var request = {
      template: {},
      context: jsreport.context,
      logger: jsreport.logger,
      options: {recipe: 'html'}
    }

    assert.throws(function () {
      jsreport.templates.handleBeforeRender(request, {})
    })
  })

  it('deleting should work', function () {
    return jsreport.documentStore.collection('templates').insert({content: 'foo'})
      .then(function (t) {
        return jsreport.documentStore.collection('templates').remove({shortid: t.shortid}).then(function () {
          return jsreport.documentStore.collection('templates').find({}).then(function (list) {
            assert.equal(list.length, 0)
          })
        })
      })
  })
})
