var path = require('path')
var assert = require('assert')
var Reporter = require('jsreport-core').Reporter

describe('templating', function () {
  var reporter

  beforeEach(function () {
    reporter = new Reporter({
      rootDirectory: path.join(__dirname, '../')
    })

    return reporter.init()
  })

  it('handleBefore should find by _id and use template', function () {
    var request = {
      template: {},
      logger: reporter.logger,
      context: reporter.context,
      options: {recipe: 'html'}
    }

    return reporter.documentStore.collection('templates').insert({content: 'foo'}).then(function (t) {
      request.template._id = t._id
      return reporter.templates.handleBeforeRender(request, {}).then(function () {
        assert.equal('foo', request.template.content)
      })
    })
  })

  it('should callback weak error when missing template', function () {
    var request = {
      template: {_id: '507f191e810c19729de860ea'},
      logger: reporter.logger,
      context: reporter.context,
      options: {recipe: 'html'}
    }

    var response = {}

    return reporter.templates.handleBeforeRender(request, response).catch(function (err) {
      assert.equal(err.weak, true)
    })
  })

  it('handleBefore should find by shortid and use template', function () {
    var request = {
      template: {},
      logger: reporter.logger,
      context: reporter.context,
      options: {recipe: 'html'}
    }

    return reporter.documentStore.collection('templates').insert({content: 'foo'}).then(function (t) {
      request.template.shortid = t.shortid
      return reporter.templates.handleBeforeRender(request, {}).then(function () {
        assert.equal('foo', request.template.content)
      })
    })
  })

  it('handleBefore should find by name and use template', function () {
    var request = {
      template: {name: 'x'},
      logger: reporter.logger,
      context: reporter.context,
      options: {recipe: 'html'}
    }

    return reporter.documentStore.collection('templates').insert({content: 'foo', name: 'x'}).then(function (t) {
      return reporter.templates.handleBeforeRender(request, {}).then(function () {
        assert.equal('foo', request.template.content)
      })
    })
  })

  it('handleBefore with content and not existing name should pass', function () {
    var request = {
      template: {name: 'x', content: ' '},
      logger: reporter.logger,
      context: reporter.context,
      options: {recipe: 'html'}
    }

    return reporter.templates.handleBeforeRender(request, {}).then(function () {
      assert.equal(' ', request.template.content)
    })
  })

  it('handleBefore with not existing template should fail requesting handleBefore second time with existing template should succeed', function () {
    var request = {
      template: {},
      context: reporter.context,
      logger: reporter.logger,
      options: {recipe: 'html'}
    }

    return reporter.documentStore.collection('templates').insert({content: 'foo'}).then(function (t) {
      request.template.shortid = 'not existing'

      return reporter.templates.handleBeforeRender(request, {}).catch(function () {
        request = {
          template: {shortid: t.shortid},
          logger: reporter.logger,
          context: reporter.context,
          options: {recipe: 'html'}
        }

        return reporter.templates.handleBeforeRender(request, {}).then(function () {
          assert.equal('foo', request.template.content)
        })
      })
    })
  })

  it('handleBefore should throw when no content and id specified', function () {
    var request = {
      template: {},
      context: reporter.context,
      logger: reporter.logger,
      options: {recipe: 'html'}
    }

    assert.throws(function () {
      reporter.templates.handleBeforeRender(request, {})
    })
  })

  it('deleting should work', function () {
    return reporter.documentStore.collection('templates').insert({content: 'foo'})
      .then(function (t) {
        return reporter.documentStore.collection('templates').remove({shortid: t.shortid}).then(function () {
          return reporter.documentStore.collection('templates').find({}).then(function (list) {
            assert.equal(list.length, 0)
          })
        })
      })
  })
})
