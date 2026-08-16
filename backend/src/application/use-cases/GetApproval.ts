import { PurchaseRequestRepository } from '../ports/PurchaseRequestRepository';
import { GetApprovalInput } from './inputs/GetApprovalInput';

export class GetApprovalUseCase {
    constructor(private readonly repository: PurchaseRequestRepository) {}

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

        return {
            request,
            approval,
        };
    }
}
