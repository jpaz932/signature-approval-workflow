import { PurchaseRequestRepository } from '../ports/PurchaseRequestRepository';
import { VerifyApprovalOtpInput } from './inputs/VerifyApprovalOtpInput';

export class VerifyApprovalOtpUseCase {
    constructor(private readonly repository: PurchaseRequestRepository) {}

    /**
     * Validates the approver's OTP and, if correct, returns the full purchase request
     * detail. Does not mutate any state — sign/reject still validate the OTP again as
     * the actual authorization for the mutating action.
     * @throws {Error} If the request/token is invalid, or the OTP is incorrect or expired.
     */
    async execute(input: VerifyApprovalOtpInput) {
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

        return {
            request,
            approval,
        };
    }
}
