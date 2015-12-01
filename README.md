# jsreport-templates
[![Build Status](https://travis-ci.org/jsreport/jsreport-templates.png?branch=master)](https://travis-ci.org/jsreport/jsreport-templates)

Templates extension hooks to the rendering process and finds the template in the persistent storage if the request identifies the template by its name or shortid.
```js
jsreport.render({ template: { name: 'name' } })
jsreport.render({ template: { shortid: 'shortid' } })
```

It also extends [jsreport studio](https://github.com/jsreport/jsreport-express) and its REST API with odata endpoint:

> `GET` http://jsreport-host/odata/templates

