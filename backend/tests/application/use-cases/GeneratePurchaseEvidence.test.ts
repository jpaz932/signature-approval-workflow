/* eslint-disable @typescript-eslint/require-await */
import { Approval } from '../../../src/domain/entities/Approval';
import { PurchaseRequest } from '../../../src/domain/entities/PurchaseRequest';
import {
    EvidencePdfData,
    PdfGenerator,
} from '../../../src/application/ports/PdfGenerator';
import { EvidenceStorage } from '../../../src/application/ports/EvidenceStorage';
import { PurchaseRequestRepository } from '../../../src/application/ports/PurchaseRequestRepository';
import { GeneratePurchaseEvidenceUseCase } from '../../../src/application/use-cases/GeneratePurchaseEvidence';
import { Otp } from '../../../src/domain/value-objects/Otp';

class FakePurchaseRequestRepository implements PurchaseRequestRepository {
    private requests: PurchaseRequest[] = [];

    add(request: PurchaseRequest): void {
        this.requests.push(request);
    }

    async save(request: PurchaseRequest): Promise<void> {
        const index = this.requests.findIndex((r) => r.id === request.id);
        if (index === -1) {
            this.requests.push(request);
        } else {
            this.requests[index] = request;
        }
    }

    async findById(id: string): Promise<PurchaseRequest | null> {
        return this.requests.find((request) => request.id === id) ?? null;
    }

    async findAll(): Promise<PurchaseRequest[]> {
        return this.requests;
    }
}

class FakePdfGenerator implements PdfGenerator {
    public calls: EvidencePdfData[] = [];

    async generate(data: EvidencePdfData): Promise<Buffer> {
        this.calls.push(data);
        return Buffer.from('fake-pdf');
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

const createSignedRequest = (): PurchaseRequest => {
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
    return request;
};

describe('GeneratePurchaseEvidenceUseCase', () => {
    let repository: FakePurchaseRequestRepository;
    let pdfGenerator: FakePdfGenerator;
    let evidenceStorage: FakeEvidenceStorage;
    let useCase: GeneratePurchaseEvidenceUseCase;

    beforeEach(() => {
        repository = new FakePurchaseRequestRepository();
        pdfGenerator = new FakePdfGenerator();
        evidenceStorage = new FakeEvidenceStorage();
        useCase = new GeneratePurchaseEvidenceUseCase(
            repository,
            pdfGenerator,
            evidenceStorage,
        );
    });

    describe('execute', () => {
        it('should generate a PDF with the purchase request data', async () => {
            const request = createSignedRequest();
            repository.add(request);

            await useCase.execute({ requestId: 'request-1' });

            expect(pdfGenerator.calls).toHaveLength(1);
            expect(pdfGenerator.calls[0]).toMatchObject({
                requestId: 'request-1',
                title: 'Compra de equipos',
                amount: 1500000,
                requesterName: 'Juan Pérez',
            });
            expect(pdfGenerator.calls[0].approvers).toHaveLength(3);
        });

        it('should store the generated PDF under a predictable key', async () => {
            const request = createSignedRequest();
            repository.add(request);

            await useCase.execute({ requestId: 'request-1' });

            expect(evidenceStorage.saved.has('evidence/request-1.pdf')).toBe(
                true,
            );
        });

        it('should attach the evidence key to the purchase request and persist it', async () => {
            const request = createSignedRequest();
            repository.add(request);

            const result = await useCase.execute({ requestId: 'request-1' });

            expect(result.getEvidenceKey()).toBe('evidence/request-1.pdf');

            const persisted = await repository.findById('request-1');
            expect(persisted?.getEvidenceKey()).toBe('evidence/request-1.pdf');
        });

        it('should throw when the purchase request does not exist', async () => {
            await expect(
                useCase.execute({ requestId: 'unknown-request' }),
            ).rejects.toThrow('Purchase request not found');
        });

        it('should throw when not all approvals have been signed yet', async () => {
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

            await expect(
                useCase.execute({ requestId: 'request-2' }),
            ).rejects.toThrow(
                'Evidence can only be attached once all approvals have been signed',
            );
        });
    });
});
