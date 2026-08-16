import { randomUUID } from 'node:crypto';
import { PurchaseRequest } from '../../domain/entities/PurchaseRequest';
import { Approval } from '../../domain/entities/Approval';
import { PurchaseRequestRepository } from '../ports/PurchaseRequestRepository';
import { CreatePurchaseRequestInput } from './inputs/CreatePurchaseRequestInput';
import { Otp } from '../../domain/value-objects/Otp';
import { NotificationService } from '../ports/NotificationService';

export class CreatePurchaseRequestUseCase {
    constructor(
        private readonly repository: PurchaseRequestRepository,
        private readonly notificationService: NotificationService,
    ) {}

    /**
     * Creates a new purchase request with the provided input, generates approvals for each approver, saves the request to the repository, and sends approval notifications.
     * @param input The input data required to create a purchase request, including title, description, amount, requester information, and approvers.
     * @returns A promise that resolves to the created PurchaseRequest.
     */
    async execute(input: CreatePurchaseRequestInput): Promise<PurchaseRequest> {
        const requestId = randomUUID();

        const approvals = input.approvers.map((approver) => {
            const approvalId = randomUUID();
            const token = randomUUID();
            const otp = Otp.generate(3);

            return new Approval(
                approvalId,
                requestId,
                token,
                approver.email,
                approver.role,
                approver.name,
                otp,
            );
        });

        const request = new PurchaseRequest(
            requestId,
            input.title,
            input.description,
            input.amount,
            input.requester,
            new Date(),
            approvals,
        );

        await this.repository.save(request);
        await this.sendApprovalNotifications(approvals);

        return request;
    }

    /**
     * Sends approval notifications to all approvers associated with the purchase request.
     * @param approvals The list of approvals for which to send notifications.
     * @returns A promise that resolves when all notifications have been sent.
     */
    private async sendApprovalNotifications(
        approvals: readonly Approval[],
    ): Promise<void> {
        const notificationPromises = approvals.map((approval) =>
            this.notificationService.sendApprovalNotification(approval),
        );
        await Promise.all(notificationPromises);
    }
}
