import type {
    APIGatewayProxyEventV2,
    APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import { ZodType } from 'zod';

export class HttpError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
    ) {
        super(message);
    }
}

/** Error messages thrown by the application layer that mean "resource not found". */
const NOT_FOUND_MESSAGES = new Set([
    'Purchase request not found',
    'Invalid approval token',
    'Evidence PDF is not available yet',
]);

export function jsonResponse(
    statusCode: number,
    body: unknown,
): APIGatewayProxyStructuredResultV2 {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    };
}

export function parseBody<T>(
    event: APIGatewayProxyEventV2,
    schema: ZodType<T>,
): T {
    let raw: unknown;

    try {
        raw = event.body ? (JSON.parse(event.body) as unknown) : {};
    } catch {
        throw new HttpError(400, 'Invalid JSON body');
    }

    const result = schema.safeParse(raw);

    if (!result.success) {
        throw new HttpError(
            400,
            `Invalid request body: ${result.error.message}`,
        );
    }

    return result.data;
}

export function parsePathParams<T>(
    event: APIGatewayProxyEventV2,
    schema: ZodType<T>,
): T {
    const result = schema.safeParse(event.pathParameters ?? {});

    if (!result.success) {
        throw new HttpError(
            400,
            `Invalid path parameters: ${result.error.message}`,
        );
    }

    return result.data;
}

function statusCodeForError(error: unknown): number {
    if (error instanceof HttpError) {
        return error.statusCode;
    }

    if (error instanceof Error) {
        if (NOT_FOUND_MESSAGES.has(error.message)) {
            return 404;
        }
        return 400;
    }

    return 500;
}

/**
 * Wraps a Lambda handler so every use case error is mapped to a JSON HTTP response with
 * a sensible status code, instead of every handler repeating its own try/catch.
 */
export function withHttpErrorHandling(
    handler: (
        event: APIGatewayProxyEventV2,
    ) => Promise<APIGatewayProxyStructuredResultV2>,
) {
    return async (
        event: APIGatewayProxyEventV2,
    ): Promise<APIGatewayProxyStructuredResultV2> => {
        try {
            return await handler(event);
        } catch (error) {
            const statusCode = statusCodeForError(error);

            if (statusCode === 500) {
                console.error(error);
            }

            const message =
                error instanceof Error ? error.message : 'Unexpected error';

            return jsonResponse(statusCode, { message });
        }
    };
}
