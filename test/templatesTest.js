var path = require('path')
var assert = require('assert')
var Reporter = require('jsreport-core').Reporter

describe('templating', function () {
  var reporter

  beforeEach(function (done) {
    reporter = new Reporter({
      rootDirectory: path.join(__dirname, '../')
    })

    reporter.init().then(function () {
      done()
    }).fail(done)
  })

  it('handleBefore should find by _id and use template', function (done) {
    var request = {
      template: {},
      context: reporter.context,
      options: {recipe: 'html'}
    }

    reporter.documentStore.collection('templates').insert({content: 'foo'}).then(function (t) {
      request.template._id = t._id
      reporter.templates.handleBeforeRender(request, {}).then(function () {
        assert.equal('foo', request.template.content)

        done()
      })
    }).catch(done)
  })

  it('should callback error when missing template', function (done) {
    var request = {
      template: {_id: '507f191e810c19729de860ea'},
      context: reporter.context,
      options: {recipe: 'html'}
    }

    var response = {}

    reporter.templates.handleBeforeRender(request, response).then(function () {
      done(new Error('Should fail'))
    }).catch(function (err) {
      assert.notEqual(null, err)
      done()
    })
  })

  it('handleBefore should find by shortid and use template', function (done) {
    var request = {
      template: {},
      context: reporter.context,
      options: {recipe: 'html'}
    }

    reporter.documentStore.collection('templates').insert({content: 'foo'}).then(function (t) {
      request.template.shortid = t.shortid
      return reporter.templates.handleBeforeRender(request, {}).then(function () {
        assert.equal('foo', request.template.content)

        done()
      })
    }).catch(done)
  })

  it('handleBefore should find by name and use template', function (done) {
    var request = {
      template: {name: 'x'},
      context: reporter.context,
      options: {recipe: 'html'}
    }

    reporter.documentStore.collection('templates').insert({content: 'foo', name: 'x'}).then(function (t) {
      return reporter.templates.handleBeforeRender(request, {}).then(function () {
        assert.equal('foo', request.template.content)

        done()
      })
    }).catch(done)
  })

  it('handleBefore with content and not existing name should pass', function (done) {
    var request = {
      template: {name: 'x', content: ' '},
      context: reporter.context,
      options: {recipe: 'html'}
    }

    return reporter.templates.handleBeforeRender(request, {}).then(function () {
      assert.equal(' ', request.template.content)
      done()
    }).catch(done)
  })

  it('handleBefore with not existing template should fail requesting handleBefore second time with existing template should succeed', function (done) {
    var request = {
      template: {},
      context: reporter.context,
      options: {recipe: 'html'}
    }

    reporter.documentStore.collection('templates').insert({content: 'foo'}).then(function (t) {
      request.template.shortid = 'not existing'

      return reporter.templates.handleBeforeRender(request, {}).fail(function () {
        request = {
          template: {shortid: t.shortid},
          context: reporter.context,
          options: {recipe: 'html'}
        }

        return reporter.templates.handleBeforeRender(request, {}).then(function () {
          assert.equal('foo', request.template.content)

          done()
        })
      })
    }).catch(done)
  })

  it('handleBefore should throw when no content and id specified', function () {
    var request = {
      template: {},
      context: reporter.context,
      options: {recipe: 'html'}
    }

    assert.throws(function () {
      reporter.templates.handleBeforeRender(request, {})
    })
  })

  it('deleting should work', function (done) {
    reporter.documentStore.collection('templates').insert({content: 'foo'})
      .then(function (t) {
        return reporter.documentStore.collection('templates').remove({shortid: t.shortid}).then(function () {
          return reporter.documentStore.collection('templates').find({}).then(function (list) {
            assert.equal(list.length, 0)
            done()
          })
        })
      }).catch(done)
  })
})
