import { z } from 'zod';

const envSchema = z.object({
    API_BASE_URL: z.url(),
});

/** Reads `process.env.API_BASE_URL` directly so Webpack DefinePlugin can inline it in the browser bundle. */
export const env = envSchema.parse({
    API_BASE_URL: process.env.API_BASE_URL,
});
