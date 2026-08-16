/* eslint-disable @typescript-eslint/require-await */
import { Approval } from '../../../src/domain/entities/Approval';
import { PurchaseRequest } from '../../../src/domain/entities/PurchaseRequest';
import { EvidenceStorage } from '../../../src/application/ports/EvidenceStorage';
import { PurchaseRequestRepository } from '../../../src/application/ports/PurchaseRequestRepository';
import { GetEvidencePdfUseCase } from '../../../src/application/use-cases/GetEvidencePdf';
import { Otp } from '../../../src/domain/value-objects/Otp';

class FakePurchaseRequestRepository implements PurchaseRequestRepository {
    private requests: PurchaseRequest[] = [];

    add(request: PurchaseRequest): void {
        this.requests.push(request);
    }

    async save(request: PurchaseRequest): Promise<void> {
        this.requests.push(request);
    }

    async findById(id: string): Promise<PurchaseRequest | null> {
        return this.requests.find((request) => request.id === id) ?? null;
    }

    async findAll(): Promise<PurchaseRequest[]> {
        return this.requests;
    }
}

class FakeEvidenceStorage implements EvidenceStorage {
    public saved = new Map<string, Buffer>();

    async save(key: string, content: Buffer): Promise<void> {
        this.saved.set(key, content);
    }

    async get(key: string): Promise<Buffer> {
        const content = this.saved.get(key);
        if (!content) {
            throw new Error('Not found');
        }
        return content;
    }
}

const createApproval = (id: string, role: string): Approval => {
    return new Approval(
        id,
        'request-1',
        `token-${id}`,
        `${id}@example.com`,
        role,
        `Approver ${id}`,
        Otp.generate(),
    );
};

const createCompletedRequestWithEvidence = (): PurchaseRequest => {
    const request = new PurchaseRequest(
        'request-1',
        'Compra de equipos',
        'Compra de tres monitores',
        1500000,
        { name: 'Juan Pérez', email: 'juan@example.com' },
        new Date(),
        [
            createApproval('approval-1', 'MANAGER'),
            createApproval('approval-2', 'FINANCE'),
            createApproval('approval-3', 'DIRECTOR'),
        ],
    );
    request.signApproval('approval-1');
    request.signApproval('approval-2');
    request.signApproval('approval-3');
    request.attachEvidence('evidence/request-1.pdf');
    return request;
};

describe('GetEvidencePdfUseCase', () => {
    it('should return the PDF bytes when evidence is available', async () => {
        const repository = new FakePurchaseRequestRepository();
        const evidenceStorage = new FakeEvidenceStorage();
        evidenceStorage.saved.set('evidence/request-1.pdf', Buffer.from('pdf'));
        repository.add(createCompletedRequestWithEvidence());
        const useCase = new GetEvidencePdfUseCase(repository, evidenceStorage);

        const result = await useCase.execute({ requestId: 'request-1' });

        expect(result.toString()).toBe('pdf');
    });

    it('should throw when the purchase request does not exist', async () => {
        const repository = new FakePurchaseRequestRepository();
        const evidenceStorage = new FakeEvidenceStorage();
        const useCase = new GetEvidencePdfUseCase(repository, evidenceStorage);

        await expect(
            useCase.execute({ requestId: 'unknown-request' }),
        ).rejects.toThrow('Purchase request not found');
    });

    it('should throw when the purchase request has no evidence yet', async () => {
        const repository = new FakePurchaseRequestRepository();
        const evidenceStorage = new FakeEvidenceStorage();
        const request = new PurchaseRequest(
            'request-2',
            'Compra de equipos',
            'Compra de tres monitores',
            1500000,
            { name: 'Juan Pérez', email: 'juan@example.com' },
            new Date(),
            [
                createApproval('approval-1', 'MANAGER'),
                createApproval('approval-2', 'FINANCE'),
                createApproval('approval-3', 'DIRECTOR'),
            ],
        );
        repository.add(request);
        const useCase = new GetEvidencePdfUseCase(repository, evidenceStorage);

        await expect(
            useCase.execute({ requestId: 'request-2' }),
        ).rejects.toThrow('Evidence PDF is not available yet');
    });
});
