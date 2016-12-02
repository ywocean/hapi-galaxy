'use strict'

module.exports = (props, location) => {
  const msg = props.msg || 'world'
  return new Promise((resolve, reject) => {
    throw new Error('😳')
  })
}
