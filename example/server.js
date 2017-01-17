'use strict'

const Hapi = require('hapi')
const server = new Hapi.Server()

// An important assumption is that the Host Environment provides a `fetch` method
require('isomorphic-fetch')

server.connection({
  port: 8000
})

server.register([
  require('../lib')
], pluginErr => {
  if (pluginErr) {
    throw pluginErr
  }

  server.route({
    path: '/',
    method: 'GET',
    handler: {
      galaxy: {
        component: require('./client/app')
      }
    }
  })

  server.start(() => {
    console.log(`Server started on port ${server.info.port}`)
  })
})

