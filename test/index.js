'use strict'

const Code = require('code')
const Lab = require('lab')
const lab = exports.lab = Lab.script()

const describe = lab.describe
const it = lab.it
const beforeEach = lab.beforeEach
const expect = Code.expect

// dependencies
const path = require('path')
const Hoek = require('hoek')
const galaxy = require('../lib')
const Hapi = require('hapi')

const Component = require('./fixtures/Component')

const galaxyRoute = {
  path: '/',
  method: 'GET',
  handler: {
    galaxy: {
      component: Component
    }
  }
}

const viewSettings = {
  engines: { html: require('ejs') },
  relativeTo: __dirname,
  path: 'fixtures'
}

describe('Hapi-Galaxy', () => {
  let server, route
  const injectRoute = (r, cb) => {
    server.route(r)
    server.inject({ method: 'GET', url: '/' }, cb)
  }

  beforeEach(done => {
    server = new Hapi.Server()
    route = Hoek.clone(galaxyRoute)
    done()
  })

  it('loads as with default options', done => {
    server.register(galaxy, pluginErr => {
      expect(pluginErr).to.be.undefined()
      done()
    })
  })

  it('rejects invalid layout options', done => {
    server.register({
      register: galaxy,
      options: {
        layout: 'whatever'
      }
    }, pluginErr => {
      expect(pluginErr.message).to.include('"layout" must be a Function')
      done()
    })
  })

  describe('custom handler:', () => {
    beforeEach(done => {
      server.connection({ port: 8000 })
      server.register(galaxy, done)
    })

    it('renders a generic component', done => {
      injectRoute(route, res => {
        expect(res.statusCode).to.equal(200)
        expect(res.payload).to.include(`<div id="__galaxy"><div>hello world!</div></div>`)
        done()
      })
    })

    it('rejects invlaid configuration', done => {
      route.handler.galaxy.layout = 'should throw'
      expect(function () { server.route(route) }).to.throw()
      done()
    })

    it('throws errors from the route handler', done => {
      route.handler = {
        galaxy: {
          component: () => Promise.reject('Render error!')
        }
      }

      injectRoute(route, res => {
        expect(res.statusCode).to.equal(500)
        done()
      })
    })

    it('detects es6 modules with a function on the `default` key', done => {
      route.handler = {
        galaxy: {
          component: {
            default: () => Promise.resolve('hello world!')
          }
        }
      }

      injectRoute(route, res => {
        expect(res.statusCode).to.equal(200)
        expect(res.payload).to.include('hello world!')
        done()
      })
    })

    describe('options.props', () => {
      it('uses props from request.pre.props', done => {
        route.config = {
          pre: [{
            assign: 'props',
            method (request, reply) {
              reply({ msg: 'foo' })
            }
          }]
        }

        injectRoute(route, res => {
          expect(res.statusCode).to.equal(200)
          expect(res.payload).to.include('hello foo!')
          done()
        })
      })

      it('uses props passed to route handler', done => {
        route.handler.galaxy.props = { msg: 'foo' }

        injectRoute(route, res => {
          expect(res.statusCode).to.equal(200)
          expect(res.payload).to.include('hello foo!')
          done()
        })
      })
    })

    describe('options.component — string value', () => {
      it('automatically loads components', done => {
        route.handler.galaxy.component = path.join(__dirname, 'fixtures', 'Component')
        route.handler.galaxy.props = { msg: 'world' }
        injectRoute(route, res => {
          expect(res.statusCode).to.equal(200)
          expect(res.payload).to.include('hello world!')
          done()
        })
      })

      it('rejects promise when encountering a render error', done => {
        route.handler = function (request, reply) {
          reply.galaxy(path.join(__dirname, 'fixtures', 'BadComponent'), {
            props: {}
          },
          function(err) {
            expect(err).to.not.be.null()
          })
        }

        injectRoute(route, res => {
          expect(res.statusCode).to.equal(500)
          done()
        })
      })
    })

    describe('options.layout', () => {
      it('uses layout passed to route handler', done => {
        route.handler.galaxy.layout = function () {
          return 'custom layout'
        }

        injectRoute(route, res => {
          expect(res.statusCode).to.equal(200)
          expect(res.payload).to.include('custom layout')
          done()
        })
      })

      it('layout: false bypasses layout render', done => {
        route.handler.galaxy.layout = false

        injectRoute(route, res => {
          expect(res.statusCode).to.equal(200)
          expect(res.payload).to.not.include('<html>')
          done()
        })
      })
    })

    describe('options.view', () => {
      beforeEach(done => {
        server.register(require('vision'), err => {
          expect(err).to.be.undefined()
          server.views(viewSettings)
          done()
        })
      })

      it('uses a custom view passed to the handler', done => {
        route.handler.galaxy.view = 'layout.html'

        injectRoute(route, res => {
          expect(res.statusCode).to.equal(200)
          expect(res.payload).to.include(['<title>Custom View!</title>', 'hello world!'])
          done()
        })
      })
    })
  })

  describe('decorator: reply.galaxy', () => {
    beforeEach(done => {
      server.connection({ port: 8000 })
      server.register(galaxy, done)
    })

    it('is available on the reply interface', done => {
      route.handler = function (request, reply) {
        reply.galaxy(Component, {
          props: {
            msg: 'foo'
          }
        })
      }

      injectRoute(route, res => {
        expect(res.statusCode).to.equal(200)
        expect(res.payload).to.include('hello foo!')
        done()
      })
    })

    it('rejects invalid configuration', done => {
      route.handler = function (request, reply) {
        reply.galaxy(Component, { layout: 'should throw' })
      }

      injectRoute(route, res => {
        expect(res.statusCode).to.equal(500)
        done()
      })
    })

    it('automatically requires components if a module name string is provided', done => {
      route.handler = function (request, reply) {
        const moduleName = path.join(__dirname, 'fixtures', 'Component')
        reply.galaxy(moduleName)
      }

      injectRoute(route, res => {
        expect(res.statusCode).to.equal(200)
        done()
      })
    })
  })

  describe('plugin: options.view', () => {
    const view = {
      register: galaxy,
      options: {
        view: 'layout.html'
      }
    }

    it('require that vision be loaded', done => {
      server.register([ require('vision'), view ], pluginErr => {
        expect(pluginErr).to.be.undefined()
        done()
      })
    })

    it('errors without vision', done => {
      server.register(view, pluginErr => {
        expect(pluginErr).to.include(['vision', view.options.view])
        done()
      })
    })

    describe('custom view options', () => {
      beforeEach(done => {
        server.connection({ port: 8000 })
        server.register([ require('vision'), view ], err => {
          expect(err).to.be.undefined()
          server.views(viewSettings)
          done()
        })
      })

      it('defaults to the view supplied in the plugin config', done => {
        injectRoute(route, res => {
          expect(res.statusCode).to.equal(200)
          expect(res.payload).to.include(['<title>Custom View!</title>', 'hello world!'])
          done()
        })
      })

      it('uses the view template in the handler', done => {
        route.handler = function (request, reply) {
          reply.galaxy(Component, {})
        }

        injectRoute(route, res => {
          expect(res.statusCode).to.equal(200)
          expect(res.payload).to.include(['<title>Custom View!</title>', 'hello world!'])
          done()
        })
      })
    })
  })
})
