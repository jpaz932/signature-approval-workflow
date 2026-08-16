/* eslint-disable @typescript-eslint/require-await */
import { Approval } from '../../../src/domain/entities/Approval';
import { PurchaseRequest } from '../../../src/domain/entities/PurchaseRequest';
import { PurchaseRequestStatus } from '../../../src/domain/entities/types/requester';
import { PdfGenerator } from '../../../src/application/ports/PdfGenerator';
import { EvidenceStorage } from '../../../src/application/ports/EvidenceStorage';
import { PurchaseRequestRepository } from '../../../src/application/ports/PurchaseRequestRepository';
import { GeneratePurchaseEvidenceUseCase } from '../../../src/application/use-cases/GeneratePurchaseEvidence';
import { SignApprovalInput } from '../../../src/application/use-cases/inputs/SignApprovalInput';
import { SignApprovalUseCase } from '../../../src/application/use-cases/SignApproval';
import { Otp } from '../../../src/domain/value-objects/Otp';
import { EvidencePdfData } from '../../../src/application/types/pdfGenerator';

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

const OTP_CODE = '123456';

const createApproval = (
    id: string,
    role: string,
    token: string,
    otp: Otp,
): Approval => {
    return new Approval(
        id,
        'request-1',
        token,
        `${id}@example.com`,
        role,
        `Approver ${id}`,
        otp,
    );
};

const createRequestWithKnownOtps = () => {
    const otp1 = Otp.generate();
    const otp2 = Otp.generate();
    const otp3 = Otp.generate();

    const request = new PurchaseRequest(
        'request-1',
        'Compra de equipos',
        'Compra de tres monitores',
        1500000,
        { name: 'Juan Pérez', email: 'juan@example.com' },
        new Date(),
        [
            createApproval('approval-1', 'MANAGER', 'token-1', otp1),
            createApproval('approval-2', 'FINANCE', 'token-2', otp2),
            createApproval('approval-3', 'DIRECTOR', 'token-3', otp3),
        ],
    );

    return {
        request,
        codes: {
            'token-1': otp1.getCode(),
            'token-2': otp2.getCode(),
            'token-3': otp3.getCode(),
        },
    };
};

describe('SignApprovalUseCase', () => {
    let repository: FakePurchaseRequestRepository;
    let pdfGenerator: FakePdfGenerator;
    let evidenceStorage: FakeEvidenceStorage;
    let useCase: SignApprovalUseCase;

    beforeEach(() => {
        repository = new FakePurchaseRequestRepository();
        pdfGenerator = new FakePdfGenerator();
        evidenceStorage = new FakeEvidenceStorage();
        const generatePurchaseEvidence = new GeneratePurchaseEvidenceUseCase(
            repository,
            pdfGenerator,
            evidenceStorage,
        );
        useCase = new SignApprovalUseCase(repository, generatePurchaseEvidence);
    });

    describe('execute', () => {
        it('should sign the approval when the OTP is correct', async () => {
            const { request, codes } = createRequestWithKnownOtps();
            repository.add(request);

            const input: SignApprovalInput = {
                requestId: 'request-1',
                token: 'token-1',
                code: codes['token-1'],
            };

            const { approval } = await useCase.execute(input);

            expect(approval.getStatus().status).toBe('SIGNED');
        });

        it('should persist the signature', async () => {
            const { request, codes } = createRequestWithKnownOtps();
            repository.add(request);

            await useCase.execute({
                requestId: 'request-1',
                token: 'token-1',
                code: codes['token-1'],
            });

            const persisted = await repository.findById('request-1');
            expect(
                persisted?.getApproval('approval-1').getStatus().status,
            ).toBe('SIGNED');
        });

        it('should complete the purchase request once the third approval is signed', async () => {
            const { request, codes } = createRequestWithKnownOtps();
            repository.add(request);

            await useCase.execute({
                requestId: 'request-1',
                token: 'token-1',
                code: codes['token-1'],
            });
            await useCase.execute({
                requestId: 'request-1',
                token: 'token-2',
                code: codes['token-2'],
            });
            await useCase.execute({
                requestId: 'request-1',
                token: 'token-3',
                code: codes['token-3'],
            });

            expect(request.getStatus()).toBe('COMPLETED');
        });

        it('should not generate evidence when fewer than three approvals are signed', async () => {
            const { request, codes } = createRequestWithKnownOtps();
            repository.add(request);

            await useCase.execute({
                requestId: 'request-1',
                token: 'token-1',
                code: codes['token-1'],
            });

            expect(pdfGenerator.calls).toHaveLength(0);
        });

        it('should generate and attach the evidence PDF once the third approval is signed', async () => {
            const { request, codes } = createRequestWithKnownOtps();
            repository.add(request);

            await useCase.execute({
                requestId: 'request-1',
                token: 'token-1',
                code: codes['token-1'],
            });
            await useCase.execute({
                requestId: 'request-1',
                token: 'token-2',
                code: codes['token-2'],
            });
            await useCase.execute({
                requestId: 'request-1',
                token: 'token-3',
                code: codes['token-3'],
            });

            expect(pdfGenerator.calls).toHaveLength(1);
            expect(evidenceStorage.saved.has('evidence/request-1.pdf')).toBe(
                true,
            );

            const persisted = await repository.findById('request-1');
            expect(persisted?.getStatus()).toBe(
                PurchaseRequestStatus.COMPLETED,
            );
            expect(persisted?.getEvidenceKey()).toBe('evidence/request-1.pdf');
        });

        it('should throw when the OTP is incorrect', async () => {
            const { request } = createRequestWithKnownOtps();
            repository.add(request);

            const input: SignApprovalInput = {
                requestId: 'request-1',
                token: 'token-1',
                code: 'wrong-code',
            };

            await expect(useCase.execute(input)).rejects.toThrow(
                'Invalid or expired OTP',
            );
        });

        it('should throw when the request does not exist', async () => {
            const input: SignApprovalInput = {
                requestId: 'unknown-request',
                token: 'token-1',
                code: OTP_CODE,
            };

            await expect(useCase.execute(input)).rejects.toThrow(
                'Purchase request not found',
            );
        });

        it('should throw when the token is invalid', async () => {
            const { request } = createRequestWithKnownOtps();
            repository.add(request);

            const input: SignApprovalInput = {
                requestId: 'request-1',
                token: 'unknown-token',
                code: OTP_CODE,
            };

            await expect(useCase.execute(input)).rejects.toThrow(
                'Invalid approval token',
            );
        });

        it('should throw when the approval was already signed', async () => {
            const { request, codes } = createRequestWithKnownOtps();
            repository.add(request);

            await useCase.execute({
                requestId: 'request-1',
                token: 'token-1',
                code: codes['token-1'],
            });

            await expect(
                useCase.execute({
                    requestId: 'request-1',
                    token: 'token-1',
                    code: codes['token-1'],
                }),
            ).rejects.toThrow(
                'Only pending approvals can be signed or rejected',
            );
        });
    });
});
