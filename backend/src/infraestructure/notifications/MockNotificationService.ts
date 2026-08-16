import { Approval } from '../../domain/entities/Approval';
import { NotificationService } from '../../application/ports/NotificationService';
import { MockMailStore } from '../../application/ports/MockMailStore';

/**
 * Simulates sending emails
 */
export class MockNotificationService implements NotificationService {
    constructor(
        private readonly mockMailStore: MockMailStore,
        private readonly frontendBaseUrl: string,
    ) {}

    /**
     * Sends an approval notification to the approver's email address, containing a link to approve the request and an OTP code for verification.
     * @param approval The approval object containing the approver's information and the request details.
     * @returns A promise that resolves when the notification has been sent and recorded in the mock mail store.
     */
    async sendApprovalNotification(approval: Approval): Promise<void> {
        const link = `${this.frontendBaseUrl}/approve?solicitud_id=${approval.requestId}&approver_token=${approval.token}`;
        const { code } = approval.getOtp();
        const subject = 'Solicitud de compra pendiente por aprobar';
        const body = `Hola ${approval.name}, tienes una solicitud de compra pendiente por aprobar. Ingresa a este link para revisarla: ${link}. Tu código de verificación es ${code} (válido por 3 minutos).`;

        console.log(
            `[mock-mail] to=${approval.email} subject="${subject}" body="${body}"`,
        );

        await this.mockMailStore.save({
            requestId: approval.requestId,
            approvalId: approval.id,
            email: approval.email,
            subject,
            body,
            sentAt: new Date(),
        });
    }
}
