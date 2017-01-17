import React from 'react'
import { renderToString } from 'react-dom/server'

const URL = 'https://api.bitcoinaverage.com/ticker/global/USD'

const App = ({ msg }) =>
  <div>{msg}</div>

export default async (props, location) => {
  const price = await fetch(URL) /* global fetch */
    .then(
      response => response.json(),
      () => {
        return { price: 'unavailable', timestamp: Date.now() }
      })

  return renderToString(<App msg={`The price is ${price.last} as of ${price.timestamp}`} />)
}
