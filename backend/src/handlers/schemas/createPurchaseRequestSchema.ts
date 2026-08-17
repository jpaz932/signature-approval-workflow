import { z } from 'zod';

export const createPurchaseRequestSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    amount: z.number().positive(),
    requester: z.object({
        name: z.string().min(1),
        email: z.email(),
    }),
    approvers: z
        .array(
            z.object({
                name: z.string().min(1),
                email: z.email(),
                role: z.string().min(1),
            }),
        )
        .length(3),
});
