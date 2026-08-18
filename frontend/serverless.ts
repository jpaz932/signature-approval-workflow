import type { AWS } from '@serverless/typescript';

const shellBucketName = '${sls:stage}-shell-${aws:accountId}';
const requesterAppBucketName = '${sls:stage}-requester-app-${aws:accountId}';
const approverAppBucketName = '${sls:stage}-approver-app-${aws:accountId}';

const cachingDisabledPolicyId = '4135ea2d-6df8-44a3-9df3-4b5a84be39ad';

function bucketPolicy(bucketLogicalId: string) {
    return {
        Type: 'AWS::S3::BucketPolicy',
        Properties: {
            Bucket: { Ref: bucketLogicalId },
            PolicyDocument: {
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: { Service: 'cloudfront.amazonaws.com' },
                        Action: 's3:GetObject',
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    {
                                        'Fn::GetAtt': [bucketLogicalId, 'Arn'],
                                    },
                                    '/*',
                                ],
                            ],
                        },
                        Condition: {
                            StringEquals: {
                                'AWS:SourceArn': {
                                    'Fn::Sub':
                                        'arn:aws:cloudfront::${AWS::AccountId}:distribution/${SiteDistribution}',
                                },
                            },
                        },
                    },
                ],
            },
        },
    };
}

const serverlessConfiguration: AWS = {
    service: 'signature-approval-workflow-frontend',
    frameworkVersion: '4',
    provider: {
        name: 'aws',
        region: 'us-east-1',
    },
    resources: {
        Resources: {
            ShellBucket: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    BucketName: shellBucketName,
                    PublicAccessBlockConfiguration: {
                        BlockPublicAcls: true,
                        BlockPublicPolicy: true,
                        IgnorePublicAcls: true,
                        RestrictPublicBuckets: true,
                    },
                },
            },
            RequesterAppBucket: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    BucketName: requesterAppBucketName,
                    PublicAccessBlockConfiguration: {
                        BlockPublicAcls: true,
                        BlockPublicPolicy: true,
                        IgnorePublicAcls: true,
                        RestrictPublicBuckets: true,
                    },
                },
            },
            ApproverAppBucket: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    BucketName: approverAppBucketName,
                    PublicAccessBlockConfiguration: {
                        BlockPublicAcls: true,
                        BlockPublicPolicy: true,
                        IgnorePublicAcls: true,
                        RestrictPublicBuckets: true,
                    },
                },
            },
            SiteOriginAccessControl: {
                Type: 'AWS::CloudFront::OriginAccessControl',
                Properties: {
                    OriginAccessControlConfig: {
                        Name: 'signature-approval-workflow-frontend',
                        OriginAccessControlOriginType: 's3',
                        SigningBehavior: 'always',
                        SigningProtocol: 'sigv4',
                    },
                },
            },
            SiteDistribution: {
                Type: 'AWS::CloudFront::Distribution',
                Properties: {
                    DistributionConfig: {
                        Enabled: true,
                        DefaultRootObject: 'index.html',
                        HttpVersion: 'http2',
                        Origins: [
                            {
                                Id: 'ShellBucketOrigin',
                                DomainName: {
                                    'Fn::GetAtt': [
                                        'ShellBucket',
                                        'RegionalDomainName',
                                    ],
                                },
                                OriginAccessControlId: {
                                    Ref: 'SiteOriginAccessControl',
                                },
                                S3OriginConfig: { OriginAccessIdentity: '' },
                            },
                            {
                                Id: 'RequesterAppBucketOrigin',
                                DomainName: {
                                    'Fn::GetAtt': [
                                        'RequesterAppBucket',
                                        'RegionalDomainName',
                                    ],
                                },
                                OriginAccessControlId: {
                                    Ref: 'SiteOriginAccessControl',
                                },
                                S3OriginConfig: { OriginAccessIdentity: '' },
                            },
                            {
                                Id: 'ApproverAppBucketOrigin',
                                DomainName: {
                                    'Fn::GetAtt': [
                                        'ApproverAppBucket',
                                        'RegionalDomainName',
                                    ],
                                },
                                OriginAccessControlId: {
                                    Ref: 'SiteOriginAccessControl',
                                },
                                S3OriginConfig: { OriginAccessIdentity: '' },
                            },
                        ],
                        DefaultCacheBehavior: {
                            TargetOriginId: 'ShellBucketOrigin',
                            ViewerProtocolPolicy: 'redirect-to-https',
                            AllowedMethods: ['GET', 'HEAD'],
                            CachedMethods: ['GET', 'HEAD'],
                            Compress: true,
                            CachePolicyId: cachingDisabledPolicyId,
                        },
                        CacheBehaviors: [
                            {
                                PathPattern: '/requester-app/*',
                                TargetOriginId: 'RequesterAppBucketOrigin',
                                ViewerProtocolPolicy: 'redirect-to-https',
                                AllowedMethods: ['GET', 'HEAD'],
                                CachedMethods: ['GET', 'HEAD'],
                                Compress: true,
                                CachePolicyId: cachingDisabledPolicyId,
                            },
                            {
                                PathPattern: '/approver-app/*',
                                TargetOriginId: 'ApproverAppBucketOrigin',
                                ViewerProtocolPolicy: 'redirect-to-https',
                                AllowedMethods: ['GET', 'HEAD'],
                                CachedMethods: ['GET', 'HEAD'],
                                Compress: true,
                                CachePolicyId: cachingDisabledPolicyId,
                            },
                        ],
                        CustomErrorResponses: [
                            {
                                ErrorCode: 403,
                                ResponseCode: 200,
                                ResponsePagePath: '/index.html',
                            },
                            {
                                ErrorCode: 404,
                                ResponseCode: 200,
                                ResponsePagePath: '/index.html',
                            },
                        ],
                    },
                },
            },
            ShellBucketPolicy: bucketPolicy('ShellBucket'),
            RequesterAppBucketPolicy: bucketPolicy('RequesterAppBucket'),
            ApproverAppBucketPolicy: bucketPolicy('ApproverAppBucket'),
        },
        Outputs: {
            CloudFrontDomain: {
                Value: {
                    'Fn::GetAtt': ['SiteDistribution', 'DomainName'],
                },
            },
            ShellBucketName: {
                Value: { Ref: 'ShellBucket' },
            },
            RequesterAppBucketName: {
                Value: { Ref: 'RequesterAppBucket' },
            },
            ApproverAppBucketName: {
                Value: { Ref: 'ApproverAppBucket' },
            },
        },
    },
};

module.exports = serverlessConfiguration;
