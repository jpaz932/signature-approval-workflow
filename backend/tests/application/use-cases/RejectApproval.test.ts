/* eslint-disable @typescript-eslint/require-await */
import { Approval } from '../../../src/domain/entities/Approval';
import { PurchaseRequest } from '../../../src/domain/entities/PurchaseRequest';
import { PurchaseRequestRepository } from '../../../src/application/ports/PurchaseRequestRepository';
import { RejectApprovalInput } from '../../../src/application/use-cases/inputs/RejectApprovalInput';
import { RejectApprovalUseCase } from '../../../src/application/use-cases/RejectApproval';
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

describe('RejectApprovalUseCase', () => {
    let repository: FakePurchaseRequestRepository;
    let useCase: RejectApprovalUseCase;

    beforeEach(() => {
        repository = new FakePurchaseRequestRepository();
        useCase = new RejectApprovalUseCase(repository);
    });

    describe('execute', () => {
        it('should reject the approval when the OTP is correct', async () => {
            const { request, codes } = createRequestWithKnownOtps();
            repository.add(request);

            const input: RejectApprovalInput = {
                requestId: 'request-1',
                token: 'token-1',
                code: codes['token-1'],
            };

            const { approval } = await useCase.execute(input);

            expect(approval.getStatus().status).toBe('REJECTED');
        });

        it('should mark the purchase request as rejected', async () => {
            const { request, codes } = createRequestWithKnownOtps();
            repository.add(request);

            await useCase.execute({
                requestId: 'request-1',
                token: 'token-1',
                code: codes['token-1'],
            });

            expect(request.getStatus()).toBe('REJECTED');
        });

        it('should persist the rejection', async () => {
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
            ).toBe('REJECTED');
        });

        it('should throw when the OTP is incorrect', async () => {
            const { request } = createRequestWithKnownOtps();
            repository.add(request);

            const input: RejectApprovalInput = {
                requestId: 'request-1',
                token: 'token-1',
                code: 'wrong-code',
            };

            await expect(useCase.execute(input)).rejects.toThrow(
                'Invalid or expired OTP',
            );
        });

        it('should throw when the request does not exist', async () => {
            const input: RejectApprovalInput = {
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

            const input: RejectApprovalInput = {
                requestId: 'request-1',
                token: 'unknown-token',
                code: OTP_CODE,
            };

            await expect(useCase.execute(input)).rejects.toThrow(
                'Invalid approval token',
            );
        });

        it('should throw when trying to reject another approval after the request was rejected', async () => {
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
                    token: 'token-2',
                    code: codes['token-2'],
                }),
            ).rejects.toThrow('Only pending purchase requests can be modified');
        });
    });
});
