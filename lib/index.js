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

  replySchema: {
    layout: Joi.func().default(defaultLayout),
    path: Joi.string().optional(),
    props: Joi.object().default({}),
    view: Joi.string().optional()
  },

  handlerSchema: {
    component: Joi.func().required(),
    props: Joi.object().optional(),
    layout: Joi.func().optional(),
    view: Joi.string().optional()
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
          component: AboutPage
        }
      }
    }
    ```
    */
    server.handler('galaxy', (route, handlerOptions) => {
      const config = Joi.validate(handlerOptions, internals.handlerSchema)
      if (config.error) {
        throw new Error(config.error)
      }
      const component = config.value.component
      const view = config.value.view || settings.view

      return (request, reply) => {
        const layout = config.value.layout || settings.layout
        const path = request.path
        const props = request.pre.props || config.value.props || {}

        reply.galaxy(component, { props, view, path, layout })
      }
    })

    /*
    Reply interface

    ```
    reply.galaxy(AboutPage, { props, path, view, layout })
    ```
     */
    server.decorate('reply', 'galaxy', function (component, replyConfig) {
      const config = Joi.validate(replyConfig, internals.replySchema)
      if (config.error) {
        return this.response(new Error(config.err))
      }
      const layout = config.value.layout
      const path = config.value.path
      const props = config.value.props
      const view = config.value.view || settings.view

      component(props, path)
        .then(content => {
          if (view) {
            this.view(view, { content, props })
          } else {
            this.response(layout(content, props))
          }
        }, renderErr => {
          this.response(new Error(renderErr))
        })
    })

    return next()
  })
}

module.exports.attributes = {
  name: 'galaxy',
  version: pkg.version
}
