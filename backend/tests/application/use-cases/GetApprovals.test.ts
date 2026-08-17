/* eslint-disable @typescript-eslint/require-await */
import { Approval } from '../../../src/domain/entities/Approval';
import { PurchaseRequest } from '../../../src/domain/entities/PurchaseRequest';
import { PurchaseRequestRepository } from '../../../src/application/ports/PurchaseRequestRepository';
import { GetApprovalInput } from '../../../src/application/use-cases/inputs/GetApprovalInput';
import { GetApprovalUseCase } from '../../../src/application/use-cases/GetApproval';
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

const createRequest = (): PurchaseRequest => {
    const requestId = 'request-1';

    const approvals = [
        new Approval(
            'approval-1',
            requestId,
            'token-1',
            'manager@example.com',
            'Manager',
            'MANAGER',
            Otp.generate(),
        ),
        new Approval(
            'approval-2',
            requestId,
            'token-2',
            'finance@example.com',
            'Finance',
            'FINANCE',
            Otp.generate(),
        ),
        new Approval(
            'approval-3',
            requestId,
            'token-3',
            'director@example.com',
            'Director',
            'DIRECTOR',
            Otp.generate(),
        ),
    ];

    return new PurchaseRequest(
        requestId,
        'Compra de equipos',
        'Compra de tres monitores',
        1500000,
        {
            name: 'Juan Pérez',
            email: 'juan@example.com',
        },
        new Date(),
        approvals,
    );
};

describe('GetApprovalUseCase', () => {
    let repository: FakePurchaseRequestRepository;
    let useCase: GetApprovalUseCase;

    beforeEach(() => {
        repository = new FakePurchaseRequestRepository();
        useCase = new GetApprovalUseCase(repository);
    });

    describe('execute', () => {
        it('should return the purchase request and approval for a valid token', async () => {
            const request = createRequest();

            repository.add(request);

            const input: GetApprovalInput = {
                requestId: 'request-1',
                token: 'token-2',
            };

            const result = await useCase.execute(input);

            expect(result.request).toBe(request);
            expect(result.approval).toBe(request.getApprovals()[1]);
        });

        it('should throw an error when the purchase request does not exist', async () => {
            const input: GetApprovalInput = {
                requestId: 'unknown-request',
                token: 'token-1',
            };

            await expect(useCase.execute(input)).rejects.toThrow(
                'Purchase request not found',
            );
        });

        it('should throw an error when the approval token is invalid', async () => {
            const request = createRequest();

            repository.add(request);

            const input: GetApprovalInput = {
                requestId: 'request-1',
                token: 'invalid-token',
            };

            await expect(useCase.execute(input)).rejects.toThrow(
                'Invalid approval token',
            );
        });

        it('should return the approval associated with the provided token', async () => {
            const request = createRequest();

            repository.add(request);

            const input: GetApprovalInput = {
                requestId: 'request-1',
                token: 'token-3',
            };

            const result = await useCase.execute(input);

            expect(result.approval.id).toBe('approval-3');
            expect(result.approval.token).toBe('token-3');
            expect(result.approval.role).toBe('Director');
        });

        it('should automatically reject the request when the OTP window passed without action', async () => {
            const requestId = 'request-1';
            const approvals = [
                new Approval(
                    'approval-1',
                    requestId,
                    'token-1',
                    'manager@example.com',
                    'MANAGER',
                    'Manager',
                    Otp.generate(1 / 60),
                ),
                new Approval(
                    'approval-2',
                    requestId,
                    'token-2',
                    'finance@example.com',
                    'FINANCE',
                    'Finance',
                    Otp.generate(),
                ),
                new Approval(
                    'approval-3',
                    requestId,
                    'token-3',
                    'director@example.com',
                    'DIRECTOR',
                    'Director',
                    Otp.generate(),
                ),
            ];
            const request = new PurchaseRequest(
                requestId,
                'Compra de equipos',
                'Compra de tres monitores',
                1500000,
                { name: 'Juan Pérez', email: 'juan@example.com' },
                new Date(),
                approvals,
            );
            repository.add(request);

            await new Promise((resolve) => setTimeout(resolve, 1100));

            const result = await useCase.execute({
                requestId,
                token: 'token-1',
            });

            expect(result.approval.getStatus().status).toBe('REJECTED');
            expect(result.request.getStatus()).toBe('REJECTED');
        });

        it('should not touch an approval whose OTP is still valid', async () => {
            const request = createRequest();
            repository.add(request);

            const result = await useCase.execute({
                requestId: 'request-1',
                token: 'token-1',
            });

            expect(result.approval.getStatus().status).toBe('PENDING');
            expect(result.request.getStatus()).toBe('PENDING');
        });
    });
});
