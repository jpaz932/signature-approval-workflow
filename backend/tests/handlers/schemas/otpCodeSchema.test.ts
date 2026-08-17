import { otpCodeSchema } from '../../../src/handlers/schemas/otpCodeSchema';

describe('otpCodeSchema', () => {
    it('should accept a non-empty code', () => {
        const result = otpCodeSchema.safeParse({ code: '123456' });

        expect(result.success).toBe(true);
    });

    it('should reject an empty code', () => {
        const result = otpCodeSchema.safeParse({ code: '' });

        expect(result.success).toBe(false);
    });

    it('should reject a missing code', () => {
        const result = otpCodeSchema.safeParse({});

        expect(result.success).toBe(false);
    });

    it('should reject a non-string code', () => {
        const result = otpCodeSchema.safeParse({ code: 123456 });

        expect(result.success).toBe(false);
    });
});
