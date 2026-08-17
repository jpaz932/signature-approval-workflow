import { PurchaseRequestRepository } from '../ports/PurchaseRequestRepository';
import { GeneratePurchaseEvidenceUseCase } from './GeneratePurchaseEvidence';
import { SignApprovalInput } from './inputs/SignApprovalInput';

export class SignApprovalUseCase {
    constructor(
        private readonly repository: PurchaseRequestRepository,
        private readonly generatePurchaseEvidence: GeneratePurchaseEvidenceUseCase,
    ) {}

    /**
     * Validates the approver's OTP and records their signature on the matching approval.
     * If this was the last of the three required signatures, generates the evidence PDF.
     * @throws {Error} If the request/token is invalid, the OTP is incorrect or expired, or
     * the approval/request is not in a state that can be signed.
     */
    async execute(input: SignApprovalInput) {
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
        request.signApproval(approval.id);

        await this.repository.save(request);

        // If all approvals are signed, generate the evidence PDF and return the updated request.
        const finalRequest = request.allApprovalsSigned()
            ? await this.generatePurchaseEvidence.execute({
                  requestId: request.id,
              })
            : request;

        return {
            request: finalRequest,
            approval,
        };
    }
}
