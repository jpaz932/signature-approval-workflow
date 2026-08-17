/* eslint-disable @typescript-eslint/require-await */
import { Approval } from '../../../src/domain/entities/Approval';
import { PurchaseRequest } from '../../../src/domain/entities/PurchaseRequest';
import { PurchaseRequestRepository } from '../../../src/application/ports/PurchaseRequestRepository';
import { VerifyApprovalOtpInput } from '../../../src/application/use-cases/inputs/VerifyApprovalOtpInput';
import { VerifyApprovalOtpUseCase } from '../../../src/application/use-cases/VerifyApprovalOtp';
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
            createApproval('approval-3', 'DIRECTOR', 'token-3', Otp.generate()),
        ],
    );

    return {
        request,
        codes: {
            'token-1': otp1.getCode(),
            'token-2': otp2.getCode(),
        },
    };
};

describe('VerifyApprovalOtpUseCase', () => {
    let repository: FakePurchaseRequestRepository;
    let useCase: VerifyApprovalOtpUseCase;

    beforeEach(() => {
        repository = new FakePurchaseRequestRepository();
        useCase = new VerifyApprovalOtpUseCase(repository);
    });

    describe('execute', () => {
        it('should return the full purchase request detail when the OTP is correct', async () => {
            const { request, codes } = createRequestWithKnownOtps();
            repository.add(request);

            const input: VerifyApprovalOtpInput = {
                requestId: 'request-1',
                token: 'token-1',
                code: codes['token-1'],
            };

            const result = await useCase.execute(input);

            expect(result.request).toBe(request);
            expect(result.approval.id).toBe('approval-1');
        });

        it('should not change the approval status', async () => {
            const { request, codes } = createRequestWithKnownOtps();
            repository.add(request);

            const { approval } = await useCase.execute({
                requestId: 'request-1',
                token: 'token-1',
                code: codes['token-1'],
            });

            expect(approval.getStatus().status).toBe('PENDING');
        });

        it('should throw when the OTP is incorrect', async () => {
            const { request } = createRequestWithKnownOtps();
            repository.add(request);

            const input: VerifyApprovalOtpInput = {
                requestId: 'request-1',
                token: 'token-1',
                code: 'wrong-code',
            };

            await expect(useCase.execute(input)).rejects.toThrow(
                'Invalid or expired OTP',
            );
        });

        it('should throw when the request does not exist', async () => {
            const input: VerifyApprovalOtpInput = {
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

            const input: VerifyApprovalOtpInput = {
                requestId: 'request-1',
                token: 'unknown-token',
                code: OTP_CODE,
            };

            await expect(useCase.execute(input)).rejects.toThrow(
                'Invalid approval token',
            );
        });

        it('should automatically reject the request once OTP attempts are exhausted', async () => {
            const { request } = createRequestWithKnownOtps();
            repository.add(request);

            for (let i = 0; i < 2; i += 1) {
                await expect(
                    useCase.execute({
                        requestId: 'request-1',
                        token: 'token-1',
                        code: 'wrong-code',
                    }),
                ).rejects.toThrow('Invalid or expired OTP');
            }

            expect(request.getStatus()).toBe('PENDING');

            await expect(
                useCase.execute({
                    requestId: 'request-1',
                    token: 'token-1',
                    code: 'wrong-code',
                }),
            ).rejects.toThrow(
                'Too many failed OTP attempts: the request was automatically rejected',
            );

            expect(request.getStatus()).toBe('REJECTED');
        });

        it('should automatically reject the request when the OTP window already passed', async () => {
            const otp = Otp.generate(1 / 60);
            const request = new PurchaseRequest(
                'request-1',
                'Compra de equipos',
                'Compra de tres monitores',
                1500000,
                { name: 'Juan Pérez', email: 'juan@example.com' },
                new Date(),
                [
                    createApproval('approval-1', 'MANAGER', 'token-1', otp),
                    createApproval(
                        'approval-2',
                        'FINANCE',
                        'token-2',
                        Otp.generate(),
                    ),
                    createApproval(
                        'approval-3',
                        'DIRECTOR',
                        'token-3',
                        Otp.generate(),
                    ),
                ],
            );
            repository.add(request);

            await new Promise((resolve) => setTimeout(resolve, 1100));

            await expect(
                useCase.execute({
                    requestId: 'request-1',
                    token: 'token-1',
                    code: '000000',
                }),
            ).rejects.toThrow(
                'OTP expired: the request was automatically rejected',
            );

            expect(request.getStatus()).toBe('REJECTED');
        });
    });
});
