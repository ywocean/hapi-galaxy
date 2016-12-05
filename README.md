# Hapi Galaxy

Front-end component rendering plugin for hapi.js.

[![Build Status](https://travis-ci.org/creditkarma/hapi-galaxy.svg?branch=master)](https://travis-ci.org/creditkarma/hapi-galaxy)

## Introduction

Use **hapi-galaxy** to transform any front-end component into server-rendered output.

## Motivations

1. Provide a bridge between Credit Karma's server side JavaScript rendering conventions and our Node.js Web App servers.
2. Lay the groundwork for programmatic integration with [Next.js][next.js] or any other that exports an interface for server side renders (ember fastboot, etc.).

## Assumptions

* Your FE code lives in some other module
* You have exported an entry point _intended_ for server-side rendering, e.g., a React app compiled with Babel and Webpack, without any references to browser specific globals in the runtime
* "Bring your own render method"
  * Runtime errors are bad and make universal rendering unpredictable
  * Requiring your entire application's dependency tree is onerous
  * All renders are wrapped in a callback or promise
  * Dependencies for render belong to the front end application
    * We use React today, but we may use something else tomorrow

## Usage

Install **hapi-galaxy** and add it to your Hapi.js project's dependencies

```
npm install hapi-galaxy --save
```

Then, register the plugin with your Hapi.js server:

```javascript
server.register(require('hapi-galaxy'), pluginErr => {
  if (pluginErr) throw pluginErr

  server.route({
    path: '/',
    method: 'GET',
    handler: {
      galaxy: {
        component: require('./frontend/component')
      }
    }
  })

  server.start((err) => {

    console.log(`Server started at: ${server.info.uri}`);
  })
})
```

## Options

The galaxy handler object has the following properties:

* `component` — a string with the name of the module to use when `require`'ing your FE code, or function with the signature `function(props, location)` which returns a promise that resolves with the rendered output of your component.  
  * See the [client interface guidelines](#client-interface) for more details.
* `layout` – function with the signature `function(props, children)` to provide the document which encapsulates your component output. _Will be ignored if `view` option is provided._
* `path` — current url being requested. Useful for handling route logic within a bundled component.
* `props` — object containing any additional properties to be passed to the view.
* `view` – string corresponding to the [vision][vision] view template to be used.

[vision]: https://github.com/hapijs/vision

### `reply.galaxy(component, options)`

* `component` — a string or function
* `options` — an object including the same keys and restrictions defined by the
 [route `galaxy` handler options](#options), excluding the component

## Client Interface

So, here's the thing:

**Client code can throw errors when you try to render it on the server.**

Obviously, in a perfect world this doesn't happen very often. But since it can, and since we don't want the output of random client errors manifesting themselves on a production server, your render method needs to be a Promise that resolves with the successful output of your render.

Here's what a simple Client would look like:

In **frontend/component.js**

```javascript
'use strict'
import React from 'react'
import { renderToString } from 'react-dom/server'
import MyApp from './app'

export default props =>
  new Promise((resolve, reject) => {
    resolve(renderToString(<MyApp {...props} />))
  })
```

In **server.js**

```javascript
server.route({
  path: '/',
  method: 'GET',
  handler: {
    galaxy: {
      component: require('./frontend/component')
    }
  }
})
```
