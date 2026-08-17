import z from 'zod';
import { REQUIRED_APPROVERS } from '../constants';

export const formSchema = z.object({
    title: z.string().min(1, 'El título es obligatorio'),
    description: z.string().min(1, 'La descripción es obligatoria'),
    amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
    requesterName: z.string().min(1, 'Tu nombre es obligatorio'),
    requesterEmail: z.email('Correo inválido'),
    approverIds: z
        .array(z.string())
        .length(
            REQUIRED_APPROVERS,
            `Selecciona exactamente ${REQUIRED_APPROVERS} aprobadores`,
        ),
});

export type FormInput = z.input<typeof formSchema>;
export type FormOutput = z.output<typeof formSchema>;
