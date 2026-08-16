import { PurchaseRequestRepository } from '../ports/PurchaseRequestRepository';
import { RejectApprovalInput } from './inputs/RejectApprovalInput';

export class RejectApprovalUseCase {
    constructor(private readonly repository: PurchaseRequestRepository) {}

    /**
     * Validates the approver's OTP and records their rejection on the matching approval.
     * @throws {Error} If the request/token is invalid, the OTP is incorrect or expired, or
     * the approval/request is not in a state that can be rejected.
     */
    async execute(input: RejectApprovalInput) {
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

        approval.validateOtp(input.code);
        request.rejectApproval(approval.id);

        await this.repository.save(request);

        return {
            request,
            approval,
        };
    }
}
