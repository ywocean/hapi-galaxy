'use strict'

const React = require('react')

const Component = function (props) {
  return React.createElement('div', {}, `hello ${props.msg}!`)
}

module.exports = Component
