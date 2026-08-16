import { EvidenceStorage } from '../ports/EvidenceStorage';
import { PurchaseRequestRepository } from '../ports/PurchaseRequestRepository';
import { GetEvidencePdfInput } from './inputs/GetEvidencePdfInput';

export class GetEvidencePdfUseCase {
    constructor(
        private readonly repository: PurchaseRequestRepository,
        private readonly evidenceStorage: EvidenceStorage,
    ) {}

    /**
     * Retrieves the evidence PDF bytes for a completed purchase request.
     * @throws {Error} If the purchase request does not exist or has no evidence PDF yet.
     */
    async execute(input: GetEvidencePdfInput): Promise<Buffer> {
        const request = await this.repository.findById(input.requestId);

        if (!request) {
            throw new Error('Purchase request not found');
        }

        const evidenceKey = request.getEvidenceKey();

        if (!evidenceKey) {
            throw new Error('Evidence PDF is not available yet');
        }

        return this.evidenceStorage.get(evidenceKey);
    }
}
