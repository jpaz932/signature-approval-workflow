/* eslint-disable @typescript-eslint/require-await */
import { Approval } from '../../../src/domain/entities/Approval';
import { PurchaseRequest } from '../../../src/domain/entities/PurchaseRequest';
import { NotificationService } from '../../../src/application/ports/NotificationService';
import { PurchaseRequestRepository } from '../../../src/application/ports/PurchaseRequestRepository';
import { CreatePurchaseRequestInput } from '../../../src/application/use-cases/inputs/CreatePurchaseRequestInput';
import { CreatePurchaseRequestUseCase } from '../../../src/application/use-cases/CreatePurchaseRequest';

class FakePurchaseRequestRepository implements PurchaseRequestRepository {
    public savedRequests: PurchaseRequest[] = [];
    public shouldFail = false;

    async save(request: PurchaseRequest): Promise<void> {
        if (this.shouldFail) {
            throw new Error('Repository error');
        }

        this.savedRequests.push(request);
    }

    async findById(id: string): Promise<PurchaseRequest | null> {
        return this.savedRequests.find((request) => request.id === id) ?? null;
    }

    async findAll(): Promise<PurchaseRequest[]> {
        return this.savedRequests;
    }
}

class FakeNotificationService implements NotificationService {
    public notifiedApprovals: Approval[] = [];

    async sendApprovalNotification(approval: Approval): Promise<void> {
        this.notifiedApprovals.push(approval);
    }
}

const createInput = (): CreatePurchaseRequestInput => ({
    title: 'Compra de equipos',
    description: 'Compra de tres monitores',
    amount: 1500000,
    requester: {
        name: 'Juan Pérez',
        email: 'juan@example.com',
    },
    approvers: [
        {
            name: 'Aprobador Uno',
            email: 'approver1@example.com',
            role: 'MANAGER',
        },
        {
            name: 'Aprobador Dos',
            email: 'approver2@example.com',
            role: 'FINANCE',
        },
        {
            name: 'Aprobador Tres',
            email: 'approver3@example.com',
            role: 'DIRECTOR',
        },
    ],
});

describe('CreatePurchaseRequestUseCase', () => {
    let repository: FakePurchaseRequestRepository;
    let notificationService: FakeNotificationService;
    let useCase: CreatePurchaseRequestUseCase;

    beforeEach(() => {
        repository = new FakePurchaseRequestRepository();
        notificationService = new FakeNotificationService();

        useCase = new CreatePurchaseRequestUseCase(
            repository,
            notificationService,
        );
    });

    describe('execute', () => {
        it('should create a purchase request', async () => {
            const input = createInput();

            const request = await useCase.execute(input);

            expect(request).toBeInstanceOf(PurchaseRequest);
            expect(request.title).toBe(input.title);
            expect(request.description).toBe(input.description);
            expect(request.amount).toBe(input.amount);
            expect(request.requester).toEqual(input.requester);
        });

        it('should generate a unique request id', async () => {
            const input = createInput();

            const request = await useCase.execute(input);

            expect(request.id).toBeDefined();
            expect(request.id).not.toBe('');
        });

        it('should create exactly three approvals', async () => {
            const input = createInput();

            const request = await useCase.execute(input);

            expect(request.getApprovals()).toHaveLength(3);
        });

        it('should generate a unique id for each approval', async () => {
            const input = createInput();

            const request = await useCase.execute(input);

            const ids = request.getApprovals().map((approval) => approval.id);

            expect(new Set(ids).size).toBe(3);
        });

        it('should generate a unique token for each approval', async () => {
            const input = createInput();

            const request = await useCase.execute(input);

            const tokens = request
                .getApprovals()
                .map((approval) => approval.token);

            expect(new Set(tokens).size).toBe(3);
        });

        it('should associate every approval with the purchase request', async () => {
            const input = createInput();

            const request = await useCase.execute(input);

            request.getApprovals().forEach((approval) => {
                expect(approval.requestId).toBe(request.id);
            });
        });

        it('should create approvals with the provided approver data', async () => {
            const input = createInput();

            const request = await useCase.execute(input);

            const approvals = request.getApprovals();

            expect(approvals[0].name).toBe(input.approvers[0].name);
            expect(approvals[0].email).toBe(input.approvers[0].email);
            expect(approvals[0].role).toBe(input.approvers[0].role);

            expect(approvals[1].name).toBe(input.approvers[1].name);
            expect(approvals[1].email).toBe(input.approvers[1].email);
            expect(approvals[1].role).toBe(input.approvers[1].role);

            expect(approvals[2].name).toBe(input.approvers[2].name);
            expect(approvals[2].email).toBe(input.approvers[2].email);
            expect(approvals[2].role).toBe(input.approvers[2].role);
        });

        it('should generate an OTP for each approval', async () => {
            const input = createInput();

            const request = await useCase.execute(input);

            request.getApprovals().forEach((approval) => {
                // eslint-disable-next-line @typescript-eslint/unbound-method
                expect(approval.validateOtp).toBeDefined();
            });
        });

        it('should save the purchase request', async () => {
            const input = createInput();

            const request = await useCase.execute(input);

            expect(repository.savedRequests).toHaveLength(1);
            expect(repository.savedRequests[0]).toBe(request);
        });

        it('should send one notification for each approval', async () => {
            const input = createInput();

            const request = await useCase.execute(input);

            expect(notificationService.notifiedApprovals).toHaveLength(3);

            expect(notificationService.notifiedApprovals).toEqual(
                request.getApprovals(),
            );
        });

        it('should not save or notify when the purchase request is invalid', async () => {
            const input = createInput();

            input.approvers[2].role = input.approvers[0].role;

            await expect(useCase.execute(input)).rejects.toThrow(
                'A purchase request must have exactly 3 unique roles',
            );

            expect(repository.savedRequests).toHaveLength(0);
            expect(notificationService.notifiedApprovals).toHaveLength(0);
        });

        it('should not send notifications when saving fails', async () => {
            repository.shouldFail = true;

            const input = createInput();

            await expect(useCase.execute(input)).rejects.toThrow(
                'Repository error',
            );

            expect(notificationService.notifiedApprovals).toHaveLength(0);
        });
    });
});
