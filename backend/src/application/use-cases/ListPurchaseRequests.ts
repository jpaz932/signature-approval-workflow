import { PurchaseRequest } from '../../domain/entities/PurchaseRequest';
import { PurchaseRequestRepository } from '../ports/PurchaseRequestRepository';

export class ListPurchaseRequestsUseCase {
    constructor(private readonly repository: PurchaseRequestRepository) {}

    /**
     * Lists every purchase request, for the requester's panel.
     */
    async execute(): Promise<PurchaseRequest[]> {
        return this.repository.findAll();
    }
}
