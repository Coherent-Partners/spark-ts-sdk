const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',

  entry: {
    index: './src/index.js',
    test: './src/test.js',
  },
  output: {
    path: path.join(__dirname, 'build'),
    filename: '[name].[hash].js',
  },

  resolve: {
    modules: ['node_modules', path.join(__dirname, 'src')],
    extensions: ['.js'],
  },

  plugins: [
    new HtmlWebpackPlugin({
      title: 'Spark Browser Test',
      template: path.join(__dirname, 'public', 'index.html'),
      filename: 'index.html',
      chunks: ['index'],
    }),
    new HtmlWebpackPlugin({
      title: 'Running tests',
      template: path.join(__dirname, 'public', 'test.html'),
      filename: 'test.html',
      chunks: ['test'],
    }),
    // SDK uses dynamic imports, so we need to tell webpack to ignore the critical dependency.
    new webpack.ContextReplacementPlugin(/@cspark\/sdk/, (data) => {
      delete data.dependencies[0].critical;
      return data;
    }),
  ],

  devServer: {
    static: { directory: path.join(__dirname, 'public') },
    compress: true,
    port: 65432,
  },
};
