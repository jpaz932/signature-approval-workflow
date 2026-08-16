/* eslint-disable @typescript-eslint/require-await */
import { Approval } from '../../../src/domain/entities/Approval';
import { PurchaseRequest } from '../../../src/domain/entities/PurchaseRequest';
import { PurchaseRequestRepository } from '../../../src/application/ports/PurchaseRequestRepository';
import { ListPurchaseRequestsUseCase } from '../../../src/application/use-cases/ListPurchaseRequests';
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

const createRequest = (id: string): PurchaseRequest => {
    return new PurchaseRequest(
        id,
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

describe('ListPurchaseRequestsUseCase', () => {
    it('should return an empty list when there are no purchase requests', async () => {
        const repository = new FakePurchaseRequestRepository();
        const useCase = new ListPurchaseRequestsUseCase(repository);

        const result = await useCase.execute();

        expect(result).toEqual([]);
    });

    it('should return every stored purchase request', async () => {
        const repository = new FakePurchaseRequestRepository();
        const requestA = createRequest('request-1');
        const requestB = createRequest('request-2');
        repository.add(requestA);
        repository.add(requestB);
        const useCase = new ListPurchaseRequestsUseCase(repository);

        const result = await useCase.execute();

        expect(result).toHaveLength(2);
        expect(result).toEqual([requestA, requestB]);
    });
});
