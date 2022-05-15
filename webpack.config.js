const path = require('path');

let config = {
  entry: './src/client.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'client.js',
    path: path.resolve(__dirname, 'public'),
  },
};

module.exports = (env, argv) => {
  if (argv.mode === 'development') {
    config.devtool = 'inline-source-map';
    config.devServer = {
      static: {
        directory: path.resolve(__dirname, 'public'),
      },
      compress: true,
      port: 8080,
    }
  }
  return config;
}
