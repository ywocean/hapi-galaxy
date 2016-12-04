'use strict'

module.exports = () => {
  return new Promise((resolve, reject) => {
    throw new Error('😳')
  })
}
