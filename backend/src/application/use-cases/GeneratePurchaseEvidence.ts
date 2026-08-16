import { PurchaseRequest } from '../../domain/entities/PurchaseRequest';
import { PdfGenerator } from '../ports/PdfGenerator';
import { EvidenceStorage } from '../ports/EvidenceStorage';
import { PurchaseRequestRepository } from '../ports/PurchaseRequestRepository';
import { GeneratePurchaseEvidenceInput } from './inputs/GeneratePurchaseEvidenceInput';
import { EvidencePdfData } from '../types/pdfGenerator';

export class GeneratePurchaseEvidenceUseCase {
    constructor(
        private readonly repository: PurchaseRequestRepository,
        private readonly pdfGenerator: PdfGenerator,
        private readonly evidenceStorage: EvidenceStorage,
    ) {}

    /**
     * Generates the evidence PDF for a completed purchase request, stores it, and attaches
     * its storage key to the request.
     * @throws {Error} If the purchase request does not exist or is not yet completed.
     */
    async execute(
        input: GeneratePurchaseEvidenceInput,
    ): Promise<PurchaseRequest> {
        const request = await this.repository.findById(input.requestId);

        if (!request) {
            throw new Error('Purchase request not found');
        }

        const pdf = await this.pdfGenerator.generate(this.toPdfData(request));

        const key = `evidence/${request.id}.pdf`;
        await this.evidenceStorage.save(key, pdf);

        request.attachEvidence(key);
        await this.repository.save(request);

        return request;
    }

    private toPdfData(request: PurchaseRequest): EvidencePdfData {
        return {
            requestId: request.id,
            title: request.title,
            description: request.description,
            amount: request.amount,
            requesterName: request.requester.name,
            createdAt: request.createdAt,
            approvers: request.getApprovals().map((approval) => {
                const status = approval.getStatus();
                return {
                    name: approval.name,
                    role: approval.role,
                    status: status.status,
                    signedAt: status.signedAt,
                };
            }),
        };
    }
}
