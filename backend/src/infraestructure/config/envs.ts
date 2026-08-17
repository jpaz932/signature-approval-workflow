import { z } from 'zod';

const envSchema = z.object({
    PURCHASE_REQUESTS_TABLE: z.string().min(1),
    MOCK_MAIL_TABLE: z.string().min(1),
    EVIDENCE_BUCKET: z.string().min(1),
    FRONTEND_BASE_URL: z.url(),
});

export const envs = envSchema.parse(process.env);
