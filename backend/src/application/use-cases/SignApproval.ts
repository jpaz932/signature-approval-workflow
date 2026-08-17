import { ApprovalStatus } from '../../domain/entities/types/approval';
import { PurchaseRequestRepository } from '../ports/PurchaseRequestRepository';
import { GeneratePurchaseEvidenceUseCase } from './GeneratePurchaseEvidence';
import { SignApprovalInput } from './inputs/SignApprovalInput';

export class SignApprovalUseCase {
    constructor(
        private readonly repository: PurchaseRequestRepository,
        private readonly generatePurchaseEvidence: GeneratePurchaseEvidenceUseCase,
    ) {}

    /**
     * Signs a purchase request approval based on the provided input.
     * Validates the OTP code and handles automatic rejection if the OTP has expired or if there are too many failed attempts.
     * @param input - An object containing the requestId, token, and OTP code for the approval.
     * @returns An object containing the purchase request and the corresponding approval.
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

        if (
            approval.getStatus().status === ApprovalStatus.PENDING &&
            approval.hasOtpExpired()
        ) {
            request.rejectApproval(approval.id);
            await this.repository.save(request);
            throw new Error(
                'OTP expired: the request was automatically rejected',
            );
        }

        try {
            approval.validateOtp(input.code);
        } catch (error) {
            if (approval.hasExceededOtpAttempts()) {
                request.rejectApproval(approval.id);
                await this.repository.save(request);
                throw new Error(
                    'Too many failed OTP attempts: the request was automatically rejected',
                    { cause: error },
                );
            }

            await this.repository.save(request);
            throw error;
        }

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
