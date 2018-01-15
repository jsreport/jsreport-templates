const JsReport = require('jsreport-core')
require('should')

describe('templating', function () {
  let jsreport

  beforeEach(() => {
    jsreport = new JsReport()
    jsreport.use(require('../')())

    return jsreport.init()
  })

  it('should find by _id and use template', async () => {
    const template = await jsreport.documentStore.collection('templates').insert({content: 'foo', engine: 'none', recipe: 'html'})
    const response = await jsreport.render({ template: { _id: template._id } })
    response.content.toString().should.be.eql('foo')
  })

  it('should callback weak error when missing template', async () => {
    try {
      await jsreport.render({template: { _id: 'aaa' }})
      throw new Error('Should have failed')
    } catch (e) {
      e.message.should.containEql('Unable to find specified template')
    }
  })

  it('should find by shortid and use template', async () => {
    const template = await jsreport.documentStore.collection('templates').insert({content: 'foo', recipe: 'html', engine: 'none'})
    const res = await jsreport.render({ template: { shortid: template.shortid } })
    res.content.toString().should.be.eql('foo')
  })

  it('should find by name and use template', async () => {
    const template = await jsreport.documentStore.collection('templates').insert({name: 'xxx', content: 'foo', recipe: 'html', engine: 'none'})
    const res = await jsreport.render({ template: { name: template.name } })
    res.content.toString().should.be.eql('foo')
  })

  it('render should throw when no content and id specified', async () => {
    try {
      await jsreport.render({template: { }})
      throw new Error('Should have failed')
    } catch (e) {
      e.message.should.containEql('emplate must contains _id')
    }
  })
})
