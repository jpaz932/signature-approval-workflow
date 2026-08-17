import { z } from 'zod';

/**
 * Validates the request body for the sign/reject approval endpoints, both of which only
 * need the OTP code (the request id and approver token come from the URL path).
 */
export const otpCodeSchema = z.object({
    code: z.string().min(1),
});
