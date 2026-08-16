import { Approval } from '../../src/domain/entities/Approval';
import { PurchaseRequest } from '../../src/domain/entities/PurchaseRequest';
import { ApprovalStatus } from '../../src/domain/entities/types/approval';
import { PurchaseRequestStatus } from '../../src/domain/entities/types/requester';
import { Otp } from '../../src/domain/value-objects/Otp';

describe('PurchaseRequest', () => {
    const createApproval = (id: string, role: string): Approval => {
        return new Approval(
            id,
            'request-1',
            `token-${id}`,
            `${id}@example.com`,
            role,
            `Approver ${id}`,
            ApprovalStatus.PENDING,
            null,
            null,
            Otp.generate(),
        );
    };

    const createApprovals = (): Approval[] => {
        return [
            createApproval('approval-1', 'MANAGER'),
            createApproval('approval-2', 'FINANCE'),
            createApproval('approval-3', 'DIRECTOR'),
        ];
    };

    const createPurchaseRequest = (
        approvals: Approval[] = createApprovals(),
    ): PurchaseRequest => {
        return new PurchaseRequest(
            'request-1',
            'Compra de equipos',
            'Compra de equipos para el área de tecnología',
            5000000,
            {
                name: 'Juan Pérez',
                email: 'juan@example.com',
            },
            new Date('2026-08-16T00:00:00.000Z'),
            approvals,
        );
    };

    describe('creation', () => {
        it('should create a purchase request with three approvals', () => {
            const request = createPurchaseRequest();

            expect(request.getStatus()).toBe(PurchaseRequestStatus.PENDING);

            expect(request.getApprovals()).toHaveLength(3);
        });

        it('should reject a purchase request with less than three approvals', () => {
            const approvals = [
                createApproval('approval-1', 'MANAGER'),
                createApproval('approval-2', 'FINANCE'),
            ];

            expect(() => createPurchaseRequest(approvals)).toThrow(
                'A purchase request must have exactly 3 approvals',
            );
        });

        it('should reject a purchase request with more than three approvals', () => {
            const approvals = [
                createApproval('approval-1', 'MANAGER'),
                createApproval('approval-2', 'FINANCE'),
                createApproval('approval-3', 'DIRECTOR'),
                createApproval('approval-4', 'LEGAL'),
            ];

            expect(() => createPurchaseRequest(approvals)).toThrow(
                'A purchase request must have exactly 3 approvals',
            );
        });

        it('should reject a purchase request with duplicated roles', () => {
            const approvals = [
                createApproval('approval-1', 'MANAGER'),
                createApproval('approval-2', 'MANAGER'),
                createApproval('approval-3', 'DIRECTOR'),
            ];

            expect(() => createPurchaseRequest(approvals)).toThrow(
                'A purchase request must have exactly 3 unique roles',
            );
        });
    });

    describe('getApproval', () => {
        it('should return an approval by its id', () => {
            const request = createPurchaseRequest();

            const approval = request.getApproval('approval-2');

            expect(approval.id).toBe('approval-2');
            expect(approval.getRole()).toBe('FINANCE');
        });

        it('should throw an error when the approval does not exist', () => {
            const request = createPurchaseRequest();

            expect(() => request.getApproval('approval-999')).toThrow(
                'Approval not found',
            );
        });
    });

    describe('signApproval', () => {
        it('should sign an approval', () => {
            const request = createPurchaseRequest();

            request.signApproval('approval-1');

            const approval = request.getApproval('approval-1');

            expect(approval.getStatus().status).toBe(ApprovalStatus.SIGNED);
        });

        it('should remain pending when only one approval is signed', () => {
            const request = createPurchaseRequest();

            request.signApproval('approval-1');

            expect(request.getStatus()).toBe(PurchaseRequestStatus.PENDING);
        });

        it('should remain pending when only two approvals are signed', () => {
            const request = createPurchaseRequest();

            request.signApproval('approval-1');
            request.signApproval('approval-2');

            expect(request.getStatus()).toBe(PurchaseRequestStatus.PENDING);
        });

        it('should be completed when all three approvals are signed', () => {
            const request = createPurchaseRequest();

            request.signApproval('approval-1');
            request.signApproval('approval-2');
            request.signApproval('approval-3');

            expect(request.getStatus()).toBe(PurchaseRequestStatus.COMPLETED);
        });

        it('should throw when trying to sign a non-existing approval', () => {
            const request = createPurchaseRequest();

            expect(() => request.signApproval('approval-999')).toThrow(
                'Approval not found',
            );
        });

        it('should not allow signing an approval twice', () => {
            const request = createPurchaseRequest();

            request.signApproval('approval-1');

            expect(() => request.signApproval('approval-1')).toThrow(
                'Only pending approvals can be signed or rejected',
            );
        });
    });

    describe('rejectApproval', () => {
        it('should reject an approval', () => {
            const request = createPurchaseRequest();

            request.rejectApproval('approval-1');

            const approval = request.getApproval('approval-1');

            expect(approval.getStatus().status).toBe(ApprovalStatus.REJECTED);
        });

        it('should reject the purchase request when an approval is rejected', () => {
            const request = createPurchaseRequest();

            request.rejectApproval('approval-1');

            expect(request.getStatus()).toBe(PurchaseRequestStatus.REJECTED);
        });

        it('should throw when trying to reject a non-existing approval', () => {
            const request = createPurchaseRequest();

            expect(() => request.rejectApproval('approval-999')).toThrow(
                'Approval not found',
            );
        });

        it('should not allow rejecting an approval twice', () => {
            const approval = createApproval('approval-1', 'MANAGER');

            approval.reject();

            expect(() => approval.reject()).toThrow(
                'Only pending approvals can be signed or rejected',
            );
        });
    });

    describe('purchase request state', () => {
        it('should not allow signing an approval after the request was rejected', () => {
            const request = createPurchaseRequest();

            request.rejectApproval('approval-1');

            expect(() => request.signApproval('approval-2')).toThrow(
                'Only pending purchase requests can be modified',
            );
        });

        it('should not allow rejecting an approval after the request was rejected', () => {
            const request = createPurchaseRequest();

            request.rejectApproval('approval-1');

            expect(() => request.rejectApproval('approval-2')).toThrow(
                'Only pending purchase requests can be modified',
            );
        });

        it('should not allow signing an approval after the request was completed', () => {
            const request = createPurchaseRequest();

            request.signApproval('approval-1');
            request.signApproval('approval-2');
            request.signApproval('approval-3');

            expect(() => request.signApproval('approval-1')).toThrow(
                'Only pending purchase requests can be modified',
            );
        });

        it('should not allow rejecting an approval after the request was completed', () => {
            const request = createPurchaseRequest();

            request.signApproval('approval-1');
            request.signApproval('approval-2');
            request.signApproval('approval-3');

            expect(() => request.rejectApproval('approval-1')).toThrow(
                'Only pending purchase requests can be modified',
            );
        });
    });
});
