/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Core extension responsible for storing, versioning and loading report templates for render req..
 */
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

  async function findTemplate () {
    async function findQuery () {
      if (req.template._id) {
        return {
          query: { _id: req.template._id },
          meta: { field: '_id', value: req.template._id }
        }
      }

      if (req.template.shortid) {
        return {
          query: { shortid: req.template.shortid },
          meta: { field: 'shortid', value: req.template.shortid }
        }
      }

      if (req.template.name) {
        const nameIsPath = req.template.name.indexOf('/') !== -1

        if (!req.template.name.startsWith('/') && nameIsPath) {
          throw reporter.createError('Invalid template path, path should be absolute and start with "/"', {
            statusCode: 400,
            weak: true
          })
        }

        const pathParts = req.template.name.split('/').filter((p) => p)

        if (pathParts.length === 0) {
          throw reporter.createError('Invalid template path, path should be absolute and target something', {
            statusCode: 400,
            weak: true
          })
        }

        const q = {
          name: nameIsPath ? [...pathParts].pop() : req.template.name
        }

        if (nameIsPath) {
          const folder = await reporter.folders.resolveFolderFromPath(req.template.name, req)

          if (folder) {
            q.folder = {
              shortid: folder.shortid
            }
          } else if (!folder && req.template.name.startsWith('/') && pathParts.length === 1) {
            q.folder = null
          }
        }

        return {
          query: q,
          meta: { field: 'name', value: req.template.name }
        }
      }
    }

    const queryResult = await findQuery()

    if (!queryResult) {
      return req.template
    }

    const templates = await reporter.documentStore.collection('templates').find(queryResult.query, req)
    let template

    if (templates.length > 1) {
      throw reporter.createError(`Duplicated templates found for query ${queryResult.meta.field}: ${queryResult.meta.value}`, {
        statusCode: 400,
        weak: true
      })
    }

    if (templates.length === 1) {
      template = templates[0]
    }

    return template
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
    name: { type: 'Edm.String', publicKey: true }
  })

  reporter.documentStore.registerEntitySet('templates', {
    entityType: 'jsreport.TemplateType',
    humanReadableKey: 'shortid',
    splitIntoDirectories: true
  })

  reporter.addRequestContextMetaConfig('currentFolderPath', { sandboxReadOnly: true })

  reporter.initializeListeners.add('templates', function () {
    var col = reporter.documentStore.collection('templates')

    if (reporter.express) {
      reporter.express.exposeOptionsToApi(definition.name, {
        'studio-link-button-visibility': definition.options['studio-link-button-visibility']
      })
    }

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
    })
  })

  reporter.beforeRenderListeners.add('templates', beforeRender(reporter, definition))
  reporter.on('express-configure', configureExpress(reporter, definition))
}
