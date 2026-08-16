import { Approval } from '../../src/domain/entities/Approval';
import { ApprovalStatus } from '../../src/domain/entities/types/approval';

describe('Approval', () => {
    const createApproval = (): Approval => {
        return new Approval(
            'approval-1',
            'request-1',
            'approver@example.com',
            'MANAGER',
            'Juan Pérez',
        );
    };

    describe('creation', () => {
        it('should create an approval with pending status', () => {
            const approval = createApproval();

            expect(approval.getStatus()).toEqual({
                status: ApprovalStatus.PENDING,
                signedAt: null,
                rejectedAt: null,
            });
        });

        it('should return the approval role', () => {
            const approval = createApproval();

            expect(approval.getRole()).toBe('MANAGER');
        });
    });

    describe('sign', () => {
        it('should sign a pending approval', () => {
            const approval = createApproval();

            approval.sign();

            const status = approval.getStatus();

            expect(status.status).toBe(ApprovalStatus.SIGNED);
            expect(status.signedAt).toBeInstanceOf(Date);
            expect(status.rejectedAt).toBeNull();
        });

        it('should not allow signing an already signed approval', () => {
            const approval = createApproval();

            approval.sign();

            expect(() => approval.sign()).toThrow(
                'Only pending approvals can be signed or rejected',
            );
        });

        it('should not allow signing a rejected approval', () => {
            const approval = createApproval();

            approval.reject();

            expect(() => approval.sign()).toThrow(
                'Only pending approvals can be signed or rejected',
            );
        });
    });

    describe('reject', () => {
        it('should reject a pending approval', () => {
            const approval = createApproval();

            approval.reject();

            const status = approval.getStatus();

            expect(status.status).toBe(ApprovalStatus.REJECTED);
            expect(status.rejectedAt).toBeInstanceOf(Date);
            expect(status.signedAt).toBeNull();
        });

        it('should not allow rejecting an already rejected approval', () => {
            const approval = createApproval();

            approval.reject();

            expect(() => approval.reject()).toThrow(
                'Only pending approvals can be signed or rejected',
            );
        });

        it('should not allow rejecting a signed approval', () => {
            const approval = createApproval();

            approval.sign();

            expect(() => approval.reject()).toThrow(
                'Only pending approvals can be signed or rejected',
            );
        });
    });
});
