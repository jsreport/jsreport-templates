/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Core extension responsible for storing, versioning and loading report templates for render req..
 */

const nanoid = require('nanoid')
const Promise = require('bluebird')
const extend = require('node.extend.without.arrays')

const beforeRender = (reporter) => async (req) => {
  if (!req.template._id && !req.template.shortid && !req.template.name) {
    if (!req.template.content) {
      var err = new Error('Template must contains _id, shortid or content attribute.')
      err.weak = true
      throw err
    }

    this.reporter.logger.info('Rendering anonymous template { recipe:' +
      req.template.recipe + ',engine:' + req.template.engine + '}', req)

    return
  }

  function findTemplate () {
    function findQuery () {
      if (req.template._id) {
        return { _id: req.template._id }
      }

      if (req.template.shortid) {
        return { shortid: req.template.shortid }
      }

      if (req.template.name) {
        return { name: req.template.name }
      }
    }

    var query = findQuery()

    if (!query) {
      return [req.template]
    }

    return reporter.documentStore.collection('templates').find(query, req)
  }

  const templates = await findTemplate()
  if (templates.length !== 1 && !req.template.content) {
    const err = new Error('Unable to find specified template or user doesnt have permissions to read it: ' + (req.template._id || req.template.shortid || req.template.name))
    err.weak = true
    throw err
  }

  req.template = templates.length ? extend(true, templates[0], req.template) : req.template
  req.template.content = req.template.content || ''
  reporter.logger.info('Rendering template {shortid:' + req.template.shortid + ', recipe:' + req.template.recipe +
      ', engine:' + req.template.engine + ', preview:' + (req.options.preview || false) + '}', req)
}

const configureExpress = (reporter) => (app) => {
  app.get('/templates/:shortid', function (req, res, next) {
    reporter.documentStore.collection('templates').find({
      shortid: req.params.shortid
    }).then((templates) => {
      if (templates.length !== 1) {
        return Promise.reject(new Error('Unauthorized'))
      }

      req.template = templates[0]

      return reporter.render(req).then(function (response) {
        if (response.headers) {
          for (var key in response.headers) {
            if (response.headers.hasOwnProperty(key)) {
              res.setHeader(key, response.headers[key])
            }
          }
        }
        response.stream.pipe(res)
      })
    }).catch(function (e) {
      next(e)
    })
  })
}

module.exports = function (reporter, definition) {
  reporter.documentStore.registerEntityType('TemplateType', {
    _id: { type: 'Edm.String', key: true },
    shortid: { type: 'Edm.String' },
    name: { type: 'Edm.String', publicKey: true },
    content: { type: 'Edm.String', document: { extension: 'html', engine: true } },
    recipe: { type: 'Edm.String' },
    helpers: { type: 'Edm.String', document: { extension: 'js' } },
    engine: { type: 'Edm.String' },
    modificationDate: { type: 'Edm.DateTimeOffset' }
  })

  reporter.documentStore.registerEntitySet('templates', {
    entityType: 'jsreport.TemplateType',
    humanReadableKey: 'shortid',
    splitIntoDirectories: true
  })

  reporter.initializeListeners.add('templates', function () {
    var col = reporter.documentStore.collection('templates')
    col.beforeUpdateListeners.add('templates', (q, u) => (u.$set.modificationDate = new Date()))
    col.beforeInsertListeners.add('templates', (doc) => {
      doc.shortid = doc.shortid || nanoid(7)
      doc.modificationDate = new Date()
    })
  })

  reporter.beforeRenderListeners.add('templates', beforeRender(reporter, definition))
  reporter.on('express-configure', configureExpress(reporter, definition))
}
