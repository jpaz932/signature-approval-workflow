import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

// eslint-disable-next-line @typescript-eslint/require-await
export const handler: APIGatewayProxyHandlerV2 = async () => {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            status: 'ok',
        }),
    };
};
