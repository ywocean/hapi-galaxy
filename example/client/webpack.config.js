'use strict'

const webpack = require('webpack')
const BabiliPlugin = require('babili-webpack-plugin')

module.exports = {
  entry: ['./src/app.js'],
  output: {
    filename: 'app.js',
    libraryTarget: 'commonjs2'
  },
  module: {
    exprContextRegExp: /$^/,
    exprContextCritical: false,
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /.json$/,
        loader: 'json-loader'
      }
    ]
  },
  plugins: [
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurrenceOrderPlugin(true),
    new BabiliPlugin()
  ]
}
