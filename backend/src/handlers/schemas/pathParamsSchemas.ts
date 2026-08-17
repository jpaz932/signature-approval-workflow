import { z } from 'zod';

/**
 * Path params for endpoints identifying a purchase request by id, e.g.
 * `GET /api/solicitudes/{id}` or `GET /api/solicitudes/{id}/evidencia.pdf`.
 */
export const purchaseRequestIdParamsSchema = z.object({
    id: z.string().min(1),
});

/**
 * Path params for endpoints identifying a single approval via its approver link, e.g.
 * `GET /api/approvals/{id}/{token}`.
 */
export const approvalParamsSchema = z.object({
    id: z.string().min(1),
    token: z.string().min(1),
});
