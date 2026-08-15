import type { AWS } from '@serverless/typescript';

const serverlessConfiguration: AWS = {
    service: 'signature-approval-workflow',
    plugins: ['serverless-offline'],
    frameworkVersion: '4',
    provider: {
        name: 'aws',
        runtime: 'nodejs24.x',
    },
    functions: {
        health: {
            handler: 'src/handlers/health.handler',
            events: [
                {
                    httpApi: {
                        path: '/health',
                        method: 'GET',
                    },
                },
            ],
        },
    },
};

module.exports = serverlessConfiguration;
