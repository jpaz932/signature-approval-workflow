import {
    approvalParamsSchema,
    purchaseRequestIdParamsSchema,
} from '../../../src/handlers/schemas/pathParamsSchemas';

describe('purchaseRequestIdParamsSchema', () => {
    it('should accept a non-empty id', () => {
        const result = purchaseRequestIdParamsSchema.safeParse({
            id: 'request-1',
        });

        expect(result.success).toBe(true);
    });

    it('should reject an empty id', () => {
        const result = purchaseRequestIdParamsSchema.safeParse({ id: '' });

        expect(result.success).toBe(false);
    });

    it('should reject a missing id', () => {
        const result = purchaseRequestIdParamsSchema.safeParse({});

        expect(result.success).toBe(false);
    });
});

describe('approvalParamsSchema', () => {
    it('should accept a non-empty id and token', () => {
        const result = approvalParamsSchema.safeParse({
            id: 'request-1',
            token: 'token-1',
        });

        expect(result.success).toBe(true);
    });

    it('should reject a missing token', () => {
        const result = approvalParamsSchema.safeParse({ id: 'request-1' });

        expect(result.success).toBe(false);
    });

    it('should reject an empty token', () => {
        const result = approvalParamsSchema.safeParse({
            id: 'request-1',
            token: '',
        });

        expect(result.success).toBe(false);
    });
});
