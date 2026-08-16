import { PurchaseRequest } from '../../domain/entities/PurchaseRequest';
import { PurchaseRequestRepository } from '../ports/PurchaseRequestRepository';
import { GetPurchaseRequestInput } from './inputs/GetPurchaseRequestInput';

export class GetPurchaseRequestUseCase {
    constructor(private readonly repository: PurchaseRequestRepository) {}

    /**
     * Gets a single purchase request with the status of all its approvals, for the
     * requester's detail view.
     * @throws {Error} If the purchase request does not exist.
     */
    async execute(input: GetPurchaseRequestInput): Promise<PurchaseRequest> {
        const request = await this.repository.findById(input.requestId);

        if (!request) {
            throw new Error('Purchase request not found');
        }

        return request;
    }
}
