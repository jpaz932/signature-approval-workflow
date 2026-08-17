const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const packageJson = require('./package.json');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { ModuleFederationPlugin } = webpack.container;
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
    mode: isProduction ? 'production' : 'development',
    context: __dirname,
    entry: './src/index.tsx',
    devtool: isProduction ? false : 'source-map',
    output: {
        path: path.resolve(__dirname, 'dist'),
        publicPath: 'auto',
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
        port: 3003,
        historyApiFallback: true,
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL),
        }),
        new ModuleFederationPlugin({
            name: 'approverApp',
            filename: 'remoteEntry.js',
            exposes: {
                './ApprovalPage': './src/pages/ApprovalPage',
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
