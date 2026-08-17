import { ApprovalStatus } from '../../domain/entities/types/approval';
import { PurchaseRequestRepository } from '../ports/PurchaseRequestRepository';
import { GetApprovalInput } from './inputs/GetApprovalInput';

export class GetApprovalUseCase {
    constructor(private readonly repository: PurchaseRequestRepository) {}

    /**
     * Retrieves a purchase request and its associated approval based on the provided input.
     * @param input - An object containing the requestId and token for the approval.
     * @returns An object containing the purchase request and the corresponding approval.
     */
    async execute(input: GetApprovalInput) {
        const request = await this.repository.findById(input.requestId);

        if (!request) {
            throw new Error('Purchase request not found');
        }

        const approval = request
            .getApprovals()
            .find((approval) => approval.token === input.token);

        if (!approval) {
            throw new Error('Invalid approval token');
        }

        // Check if the approval is still pending and if the OTP has expired. If so, reject the approval and save the updated request.
        if (
            approval.getStatus().status === ApprovalStatus.PENDING &&
            approval.hasOtpExpired()
        ) {
            request.rejectApproval(approval.id);
            await this.repository.save(request);
        }

        return {
            request,
            approval,
        };
    }
}
