import type { AWS } from '@serverless/typescript';

const purchaseRequestsTable = '${self:service}-${sls:stage}-purchase-requests';
const mockMailTable = '${self:service}-${sls:stage}-mock-mail';
const evidenceBucket = '${self:service}-${sls:stage}-evidence-${aws:accountId}';

const serverlessConfiguration: AWS = {
    service: 'signature-approval-workflow',
    plugins: ['serverless-offline'],
    frameworkVersion: '4',
    custom: {
        'serverless-offline': {
            lambdaPort: 3010,
        },
    },
    build: {
        esbuild: {
            external: ['pdfkit'],
        },
    },
    provider: {
        name: 'aws',
        runtime: 'nodejs24.x',
        region: 'us-east-1',
        httpApi: {
            cors: {
                allowedOrigins: [
                    '${env:FRONTEND_BASE_URL}',
                    'http://localhost:3001',
                    'http://localhost:3002',
                    'http://localhost:3003',
                ],
                allowedHeaders: ['Content-Type'],
                allowedMethods: ['GET', 'POST'],
            },
        },
        environment: {
            PURCHASE_REQUESTS_TABLE: purchaseRequestsTable,
            MOCK_MAIL_TABLE: mockMailTable,
            EVIDENCE_BUCKET: evidenceBucket,
            FRONTEND_BASE_URL: '${env:FRONTEND_BASE_URL}',
        },
        iam: {
            role: {
                statements: [
                    {
                        Effect: 'Allow',
                        Action: [
                            'dynamodb:GetItem',
                            'dynamodb:PutItem',
                            'dynamodb:Scan',
                        ],
                        Resource: [
                            {
                                'Fn::GetAtt': ['PurchaseRequestsTable', 'Arn'],
                            },
                            { 'Fn::GetAtt': ['MockMailTable', 'Arn'] },
                        ],
                    },
                    {
                        Effect: 'Allow',
                        Action: ['s3:PutObject', 's3:GetObject'],
                        Resource: [
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        {
                                            'Fn::GetAtt': [
                                                'EvidenceBucket',
                                                'Arn',
                                            ],
                                        },
                                        '/*',
                                    ],
                                ],
                            },
                        ],
                    },
                ],
            },
        },
    },
    functions: {
        health: {
            handler: 'src/handlers/health.handler',
            events: [{ httpApi: { path: '/health', method: 'GET' } }],
        },
        createPurchaseRequest: {
            handler: 'src/handlers/create-purchase-request.handler',
            events: [{ httpApi: { path: '/api/solicitudes', method: 'POST' } }],
        },
        listPurchaseRequests: {
            handler: 'src/handlers/list-purchase-requests.handler',
            events: [{ httpApi: { path: '/api/solicitudes', method: 'GET' } }],
        },
        getPurchaseRequest: {
            handler: 'src/handlers/get-purchase-request.handler',
            events: [
                { httpApi: { path: '/api/solicitudes/{id}', method: 'GET' } },
            ],
        },
        getEvidencePdf: {
            handler: 'src/handlers/get-evidence-pdf.handler',
            events: [
                {
                    httpApi: {
                        path: '/api/solicitudes/{id}/evidencia.pdf',
                        method: 'GET',
                    },
                },
            ],
        },
        getApproval: {
            handler: 'src/handlers/get-approval.handler',
            events: [
                {
                    httpApi: {
                        path: '/api/approvals/{id}/{token}',
                        method: 'GET',
                    },
                },
            ],
        },
        verifyApprovalOtp: {
            handler: 'src/handlers/verify-approval-otp.handler',
            events: [
                {
                    httpApi: {
                        path: '/api/approvals/{id}/{token}/verify-otp',
                        method: 'POST',
                    },
                },
            ],
        },
        signApproval: {
            handler: 'src/handlers/sign-approval.handler',
            events: [
                {
                    httpApi: {
                        path: '/api/approvals/{id}/{token}/sign',
                        method: 'POST',
                    },
                },
            ],
        },
        rejectApproval: {
            handler: 'src/handlers/reject-approval.handler',
            events: [
                {
                    httpApi: {
                        path: '/api/approvals/{id}/{token}/reject',
                        method: 'POST',
                    },
                },
            ],
        },
        mockMail: {
            handler: 'src/handlers/mock-mail.handler',
            events: [{ httpApi: { path: '/mock-mail', method: 'GET' } }],
        },
    },
    resources: {
        Resources: {
            PurchaseRequestsTable: {
                Type: 'AWS::DynamoDB::Table',
                Properties: {
                    TableName: purchaseRequestsTable,
                    BillingMode: 'PAY_PER_REQUEST',
                    AttributeDefinitions: [
                        { AttributeName: 'PK', AttributeType: 'S' },
                        { AttributeName: 'SK', AttributeType: 'S' },
                    ],
                    KeySchema: [
                        { AttributeName: 'PK', KeyType: 'HASH' },
                        { AttributeName: 'SK', KeyType: 'RANGE' },
                    ],
                },
            },
            MockMailTable: {
                Type: 'AWS::DynamoDB::Table',
                Properties: {
                    TableName: mockMailTable,
                    BillingMode: 'PAY_PER_REQUEST',
                    AttributeDefinitions: [
                        { AttributeName: 'PK', AttributeType: 'S' },
                        { AttributeName: 'SK', AttributeType: 'S' },
                    ],
                    KeySchema: [
                        { AttributeName: 'PK', KeyType: 'HASH' },
                        { AttributeName: 'SK', KeyType: 'RANGE' },
                    ],
                },
            },
            EvidenceBucket: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    BucketName: evidenceBucket,
                },
            },
        },
    },
};

module.exports = serverlessConfiguration;
