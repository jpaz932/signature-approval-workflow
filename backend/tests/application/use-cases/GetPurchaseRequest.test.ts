/* eslint-disable @typescript-eslint/require-await */
import { Approval } from '../../../src/domain/entities/Approval';
import { PurchaseRequest } from '../../../src/domain/entities/PurchaseRequest';
import { PurchaseRequestRepository } from '../../../src/application/ports/PurchaseRequestRepository';
import { GetPurchaseRequestUseCase } from '../../../src/application/use-cases/GetPurchaseRequest';
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

const createRequest = (): PurchaseRequest => {
    return new PurchaseRequest(
        'request-1',
        'Compra de equipos',
        'Compra de tres monitores',
        1500000,
        {
            name: 'Juan Pérez',
            email: 'juan@example.com',
        },
        new Date(),
        [
            createApproval('approval-1', 'MANAGER'),
            createApproval('approval-2', 'FINANCE'),
            createApproval('approval-3', 'DIRECTOR'),
        ],
    );
};

describe('GetPurchaseRequestUseCase', () => {
    it('should return the purchase request when it exists', async () => {
        const repository = new FakePurchaseRequestRepository();
        const request = createRequest();
        repository.add(request);
        const useCase = new GetPurchaseRequestUseCase(repository);

        const result = await useCase.execute({ requestId: 'request-1' });

        expect(result).toBe(request);
    });

    it('should throw an error when the purchase request does not exist', async () => {
        const repository = new FakePurchaseRequestRepository();
        const useCase = new GetPurchaseRequestUseCase(repository);

        await expect(
            useCase.execute({ requestId: 'unknown-request' }),
        ).rejects.toThrow('Purchase request not found');
    });
});
