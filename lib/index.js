'use strict'

// external dependencies

const Joi = require('joi')
const Hoek = require('hoek')
const pkg = require('../package.json')

// internals

const defaultLayout = (content, props) => `
<html>
  <head>
    <meta charset="utf8">
  </head>
  <body>
    <div id="__galaxy">${content}</div>
    <script>window.GALAXY = { __galaxy: (${JSON.stringify(props)}) };</script>
  </body>
</html>`

const internals = {
  defaults: {
    layout: defaultLayout
  },
  optionsSchema: {
    layout: Joi.func().arity(2),
    view: Joi.string().optional()
  },
  handlerSchema: {
    component: Joi.func().required()
  }
}
/*
Options

```
{
  layout: null, // a template string which render containing `content` and `props`, respectively
  view: null,   // alternately, provide a layout template to be used with the [vision][vision] plugin. It will be passed `content` and `props`, respectively
}
```
*/
module.exports = (server, options, next) => {
  const settings = Hoek.applyToDefaults(internals.defaults, options)

  Joi.validate(settings, internals.optionsSchema, optionsErr => {
    if (optionsErr) {
      return next(optionsErr)
    }

    if (settings.view && !server.views) {
      return next(`vision plugin must be loaded to use settings.view: ${settings.view}`)
    }

    /*
    Component Handler

    ```
    {
      path: '/about',
      handler: {
        galaxy: {
          component: About
        }
      }
    }
    ```
    */
    server.handler('galaxy', (route, handlerOptions) => {
      Joi.validate(handlerOptions, internals.handlerSchema)
      const component = handlerOptions.component
      const view = handlerOptions.view || settings.view

      return (request, reply) => {
        const props = request.pre.props || handlerOptions.props || {}

        component(props, request.path)
          .then(content => {
            if (view) {
              reply.view(view, { content, props })
            } else {
              reply(settings.layout(content, props))
            }
          }, renderErr => {
            reply(new Error(renderErr))
          })
      }
    })

    return next()
  })
}

module.exports.attributes = {
  name: 'galaxy',
  version: pkg.version
}
