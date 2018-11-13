/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Core extension responsible for storing, versioning and loading report templates for render req..
 */

const nanoid = require('nanoid')
const extend = require('node.extend.without.arrays')

async function resolveCurrentPath (reporter, req) {
  if (!req.template) {
    return null
  }

  const pathFragments = []
  let currentFolder = req.template.folder

  if (currentFolder) {
    currentFolder = await reporter.documentStore.collection('folders').findOne({shortid: currentFolder.shortid}, req)
  }

  while (currentFolder) {
    pathFragments.push(currentFolder.name)

    if (!currentFolder.folder) {
      currentFolder = null
    } else {
      currentFolder = await reporter.documentStore.collection('folders').findOne({shortid: currentFolder.folder.shortid}, req)
    }
  }

  return '/' + pathFragments.reverse().join('/')
}

const beforeRender = (reporter) => async (req, res) => {
  if (!req.template._id && !req.template.shortid && !req.template.name) {
    if (!req.template.content) {
      throw reporter.createError('Template must contains _id, shortid or content attribute', {
        weak: true,
        statusCode: 400
      })
    }

    reporter.logger.info(
      `Rendering anonymous template { recipe: ${req.template.recipe}, engine: ${req.template.engine} }`,
      req
    )

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
      return req.template
    }

    return reporter.documentStore.collection('templates').findOne(query, req)
  }

  const template = await findTemplate()

  if (!template && !req.template.content) {
    throw reporter.createError(`Unable to find specified template or user doesnt have permissions to read it: ${
      (req.template._id || req.template.shortid || req.template.name)
    }`, {
      weak: true,
      statusCode: 404
    })
  }

  req.template = template ? extend(true, template, req.template) : req.template
  req.template.content = req.template.content || ''

  reporter.logger.info(
    `Rendering template { name: ${req.template.name}, recipe: ${req.template.recipe}, engine: ${req.template.engine}, preview: ${(req.options.preview || false)} }`,
    req
  )

  if (!req.options.reportName && req.template.name) {
    res.meta.reportName = req.template.name
  }

  req.context.currentFolderPath = await resolveCurrentPath(reporter, req)
}

const configureExpress = (reporter) => (app) => {
  app.get('/templates/:shortid', (req, res, next) => reporter.express.render({ template: { shortid: req.params.shortid } }, req, res, next))
}

module.exports = function (reporter, definition) {
  Object.assign(reporter.documentStore.model.entityTypes['TemplateType'], {
    _id: { type: 'Edm.String', key: true },
    shortid: { type: 'Edm.String' },
    name: { type: 'Edm.String', publicKey: true },
    modificationDate: { type: 'Edm.DateTimeOffset' }
  })

  reporter.documentStore.registerEntitySet('templates', {
    entityType: 'jsreport.TemplateType',
    humanReadableKey: 'shortid',
    splitIntoDirectories: true
  })

  reporter.addRequestContextMetaConfig('currentFolderPath', { sandboxReadOnly: true })

  reporter.initializeListeners.add('templates', function () {
    var col = reporter.documentStore.collection('templates')

    col.beforeUpdateListeners.add('templates', (q, u) => (u.$set.modificationDate = new Date()))

    col.beforeInsertListeners.add('templates', (doc) => {
      if (!doc.engine) {
        throw reporter.createError('Template must contain engine', {
          weak: true,
          statusCode: 400
        })
      }
      if (!doc.recipe) {
        throw reporter.createError('Template must contain recipe', {
          weak: true,
          statusCode: 400
        })
      }

      doc.shortid = doc.shortid || nanoid(7)
      doc.modificationDate = new Date()
    })
  })

  reporter.beforeRenderListeners.add('templates', beforeRender(reporter, definition))
  reporter.on('express-configure', configureExpress(reporter, definition))
}
