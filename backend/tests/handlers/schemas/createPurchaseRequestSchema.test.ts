import { createPurchaseRequestSchema } from '../../../src/handlers/schemas/createPurchaseRequestSchema';

const validPayload = {
    title: 'Compra de equipos',
    description: 'Compra de tres monitores',
    amount: 1500000,
    requester: {
        name: 'Juan Pérez',
        email: 'juan@example.com',
    },
    approvers: [
        { name: 'Ana Gómez', email: 'ana@example.com', role: 'MANAGER' },
        { name: 'Luis Rojas', email: 'luis@example.com', role: 'FINANCE' },
        { name: 'Marta Díaz', email: 'marta@example.com', role: 'DIRECTOR' },
    ],
};

describe('createPurchaseRequestSchema', () => {
    it('should accept a valid payload', () => {
        const result = createPurchaseRequestSchema.safeParse(validPayload);

        expect(result.success).toBe(true);
    });

    it('should reject a missing title', () => {
        const { title, ...rest } = validPayload;
        void title;

        const result = createPurchaseRequestSchema.safeParse(rest);

        expect(result.success).toBe(false);
    });

    it('should reject a non-positive amount', () => {
        const result = createPurchaseRequestSchema.safeParse({
            ...validPayload,
            amount: 0,
        });

        expect(result.success).toBe(false);
    });

    it('should reject an invalid requester email', () => {
        const result = createPurchaseRequestSchema.safeParse({
            ...validPayload,
            requester: { ...validPayload.requester, email: 'not-an-email' },
        });

        expect(result.success).toBe(false);
    });

    it('should reject fewer than three approvers', () => {
        const result = createPurchaseRequestSchema.safeParse({
            ...validPayload,
            approvers: validPayload.approvers.slice(0, 2),
        });

        expect(result.success).toBe(false);
    });

    it('should reject more than three approvers', () => {
        const result = createPurchaseRequestSchema.safeParse({
            ...validPayload,
            approvers: [...validPayload.approvers, validPayload.approvers[0]],
        });

        expect(result.success).toBe(false);
    });

    it('should reject an approver with an invalid email', () => {
        const result = createPurchaseRequestSchema.safeParse({
            ...validPayload,
            approvers: [
                { ...validPayload.approvers[0], email: 'not-an-email' },
                validPayload.approvers[1],
                validPayload.approvers[2],
            ],
        });

        expect(result.success).toBe(false);
    });
});
