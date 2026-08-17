const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { container } = require('webpack');
const packageJson = require('./package.json');

const { ModuleFederationPlugin } = container;
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
    mode: isProduction ? 'production' : 'development',
    context: __dirname,
    entry: './src/index.tsx',
    devtool: isProduction ? false : 'source-map',
    output: {
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/',
        clean: true,
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: { loader: 'ts-loader', options: { transpileOnly: true } },
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    devServer: {
        port: 3001,
        historyApiFallback: true,
    },
    plugins: [
        new ModuleFederationPlugin({
            name: 'shell',
            remotes: {
                requesterApp: 'requesterApp@http://localhost:3002/remoteEntry.js',
                approverApp: 'approverApp@http://localhost:3003/remoteEntry.js',
            },
            shared: {
                react: { singleton: true, requiredVersion: packageJson.dependencies.react },
                'react-dom': {
                    singleton: true,
                    requiredVersion: packageJson.dependencies['react-dom'],
                },
                'react-router-dom': {
                    singleton: true,
                    requiredVersion: packageJson.dependencies['react-router-dom'],
                },
            },
        }),
        new HtmlWebpackPlugin({
            template: './public/index.html',
        }),
    ],
};
