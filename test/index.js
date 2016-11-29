'use strict'

const Code = require('code')
const Lab = require('lab')
const lab = exports.lab = Lab.script()

const describe = lab.describe
const it = lab.it
const beforeEach = lab.beforeEach
const expect = Code.expect

// dependencies
const galaxy = require('../lib')
const Hapi = require('hapi')

const galaxyRoute = {
  path: '/',
  method: 'GET',
  handler: {
    galaxy: {
      component (props, location) {
        const msg = props.msg || 'world'
        return new Promise((resolve, reject) => {
          resolve(`<div>hello ${msg}!</div>`)
        })
      }
    }
  }
}

describe('Hapi-Galaxy', () => {
  let server, route

  beforeEach(done => {
    server = new Hapi.Server()
    route = Object.assign({}, galaxyRoute)
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

  describe('settings.view', () => {
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

    describe('handler', () => {
      beforeEach(done => {
        server.connection({ port: 8000 })
        server.register([ require('vision'), view ], err => {
          expect(err).to.be.undefined()
          server.views({
            engines: { html: require('ejs') },
            relativeTo: __dirname,
            path: 'templates'
          })
          done()
        })
      })

      it('uses the layout template in the handler', done => {
        server.route(route)

        server.inject({ method: 'GET', url: '/' }, res => {
          expect(res.statusCode).to.equal(200)
          expect(res.payload).to.include('hello world!')
          done()
        })
      })

      it('uses the layout passed in from the route config', done => {
        route.handler = {
          galaxy: {
            component: galaxyRoute.handler.galaxy.component,
            view: 'layout.html'
          }
        }
        server.route(route)

        server.inject({ method: 'GET', url: '/' }, res => {
          expect(res.statusCode).to.equal(200)
          expect(res.payload).to.include('hello world!')
          done()
        })
      })
    })
  })

  describe('galaxy handler', () => {
    beforeEach(done => {
      server.connection({ port: 8000 })
      server.register(galaxy, done)
    })

    it('renders a generic component', done => {
      server.route(route)

      server.inject({ method: 'GET', url: '/' }, res => {
        expect(res.statusCode).to.equal(200)
        expect(res.payload).to.include('hello world!')
        done()
      })
    })

    describe('props', () => {
      it('uses props from request.pre.props', done => {
        route.config = {
          pre: [{
            assign: 'props',
            method (request, reply) {
              reply({ msg: 'foo' })
            }
          }]
        }

        server.route(route)
        server.inject({ method: 'GET', url: '/' }, res => {
          expect(res.statusCode).to.equal(200)
          expect(res.payload).to.include('hello foo!')
          done()
        })
      })

      it('uses props passed to handler config', done => {
        route.handler.galaxy.props = { msg: 'foo' }

        server.route(route)
        server.inject({ method: 'GET', url: '/' }, res => {
          expect(res.statusCode).to.equal(200)
          expect(res.payload).to.include('hello foo!')
          done()
        })
      })
    })

    it('throws errors from the route handler', done => {
      route.handler = {
        galaxy: {
          component (props, location) {
            return new Promise((resolve, reject) => reject('Render error!'))
          }
        }
      }

      server.route(route)

      server.inject({ method: 'GET', url: '/' }, res => {
        expect(res.statusCode).to.equal(500)
        done()
      })
    })
  })
})
