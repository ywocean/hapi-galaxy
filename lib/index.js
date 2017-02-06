'use strict'

// external dependencies

const Joi = require('joi')
const Hoek = require('hoek')
const pkg = require('../package.json')
const crypto = require('crypto')

// internals

const defaultLayout = (props, content) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf8">
  </head>
  <body>
    <div id="__galaxy">${content}</div>
    <script>window.GALAXY = { __galaxy: (${JSON.stringify(props)}) };</script>
  </body>
</html>`

const layoutSchema = [Joi.func(), Joi.boolean().valid(false)]

const internals = {
  defaults: {
    layout: defaultLayout,
    cache: {
      expiresIn: 3600000,
      generateTimeout: 100
    }
  },

  optionsSchema: {
    cache: Joi.object().optional(),
    layout: layoutSchema,
    view: Joi.string().optional()
  },

  replySchema: {
    layout: layoutSchema,
    path: Joi.string().optional(),
    props: Joi.object().default({}),
    view: Joi.string().optional()
  },

  handlerSchema: {
    component: [Joi.func(), Joi.string(), Joi.object()],
    layout: layoutSchema,
    props: Joi.object().optional(),
    view: Joi.string().optional()
  }
}

/*
## Plugin Options

```
{
  cache: {},
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
  ## Server Method

  Used for calling async component functions in a cache-friendly way.

  ```
  server.methods.renderComponent(component, props, path)
  ```
  */

    server.method('renderComponent', (component, props, path, done) => {
      component(props, path).then(content => {
        done(null, content)
      }, done)
    }, {
      cache: settings.cache,
      generateKey (component, props, path) {
        const hash = crypto.createHash('sha256')
        hash.update(component.toString().slice(0, 32) + JSON.stringify(props))
        return hash.digest('hex') + path
      }
    })

  /*
  ## Component Handler

  Render an async component as handler configuration

  ```
  {
    path: '/about',
    method: 'GET',
    handler: {
      galaxy: {
        component: AboutPage || './path/to/component'
        props: { message: 'hello world!' }
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
      const view = config.value.view || settings.view
      let component = config.value.component

      if (typeof component === 'string') {
        component = require(component)
      }

      return (request, reply) => {
        let layout = config.value.layout
        if (!layout && layout !== false) {
          layout = settings.layout
        }
        const path = request.path
        const props = request.pre.props || config.value.props || {}

        reply.galaxy(component, { props, view, path, layout })
      }
    })

  /*
  ## Reply Interface

  Respond to a request with an async component.

  ```
  reply.galaxy(Component, { props, path, view, layout })

  reply.galaxy('./path/to/component', { props, path, view, layout })
  ```
   */

    server.decorate('reply', 'galaxy', function (component, replyConfig = {}) {
      const config = Joi.validate(replyConfig, internals.replySchema)
      if (config.error) {
        return this.response(new Error(config.err))
      }
      const path = config.value.path
      const props = config.value.props
      const view = config.value.view || settings.view

      if (typeof component === 'string') {
        component = require(component)
      }

      if (component.default && typeof component.default === 'function') {
        component = component.default
      }

      let layout = config.value.layout
      if (!layout && layout !== false) {
        layout = defaultLayout
      }

      server.methods.renderComponent(component, props, path, (renderErr, content) => {
        if (renderErr) {
          this.response(new Error(renderErr))
          return
        }

        if (view) {
          this.view(view, { props, content })
        } else if (layout === false) {
          this.response(content)
        } else {
          this.response(layout(props, content))
        }
      })
    })

    return next()
  })
}

module.exports.attributes = {
  name: 'galaxy',
  version: pkg.version
}
