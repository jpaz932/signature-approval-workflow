import { Approval } from '../../../src/domain/entities/Approval';
import { PurchaseRequest } from '../../../src/domain/entities/PurchaseRequest';
import { ApprovalStatus } from '../../../src/domain/entities/types/approval';
import { PurchaseRequestStatus } from '../../../src/domain/entities/types/requester';
import { Otp } from '../../../src/domain/value-objects/Otp';
import {
    fromPurchaseRequestItem,
    toPurchaseRequestItem,
} from '../../../src/infraestructure/mappers/purchaseRequestMapper';

const createApproval = (id: string, role: string): Approval => {
    // Already expired, so the OTP round-trip test can assert on that deterministically
    // without depending on wall-clock timing.
    const otp = Otp.rehydrate('123456', new Date(Date.now() - 60_000));

    return new Approval(
        id,
        'request-1',
        `token-${id}`,
        `${id}@example.com`,
        role,
        `Approver ${id}`,
        otp,
    );
};

const createRequest = (): PurchaseRequest => {
    return new PurchaseRequest(
        'request-1',
        'Compra de equipos',
        'Compra de tres monitores',
        1500000,
        { name: 'Juan Pérez', email: 'juan@example.com' },
        new Date('2026-08-16T00:00:00.000Z'),
        [
            createApproval('approval-1', 'MANAGER'),
            createApproval('approval-2', 'FINANCE'),
            createApproval('approval-3', 'DIRECTOR'),
        ],
    );
};

describe('purchaseRequestMapper', () => {
    describe('toPurchaseRequestItem / fromPurchaseRequestItem', () => {
        it('should round-trip a pending purchase request without losing data', () => {
            const request = createRequest();

            const record = toPurchaseRequestItem(request);
            const rebuilt = fromPurchaseRequestItem(record);

            expect(rebuilt.id).toBe(request.id);
            expect(rebuilt.title).toBe(request.title);
            expect(rebuilt.description).toBe(request.description);
            expect(rebuilt.amount).toBe(request.amount);
            expect(rebuilt.requester).toEqual(request.requester);
            expect(rebuilt.createdAt).toEqual(request.createdAt);
            expect(rebuilt.getStatus()).toBe(request.getStatus());
            expect(rebuilt.getEvidenceKey()).toBeNull();
            expect(rebuilt.getApprovals()).toHaveLength(3);
        });

        it('should preserve each approval, including its OTP code and expiry', () => {
            const request = createRequest();

            const record = toPurchaseRequestItem(request);
            const rebuilt = fromPurchaseRequestItem(record);

            const original = request.getApproval('approval-1');
            const restored = rebuilt.getApproval('approval-1');

            expect(restored.id).toBe(original.id);
            expect(restored.token).toBe(original.token);
            expect(restored.email).toBe(original.email);
            expect(restored.role).toBe(original.role);
            expect(restored.name).toBe(original.name);
            expect(restored.getOtp()).toEqual(original.getOtp());
            expect(restored.getStatus()).toEqual(original.getStatus());
        });

        it('should preserve the original expiry, not extend it, when rehydrating the OTP', () => {
            const request = createRequest();

            const record = toPurchaseRequestItem(request);
            const rebuilt = fromPurchaseRequestItem(record);

            const restored = rebuilt.getApproval('approval-1');

            expect(() => restored.validateOtp('123456')).toThrow(
                'Invalid or expired OTP',
            );
        });

        it('should preserve a signed approval and a completed request with evidence', () => {
            const request = createRequest();
            request.signApproval('approval-1');
            request.signApproval('approval-2');
            request.signApproval('approval-3');
            request.attachEvidence('evidence/request-1.pdf');

            const record = toPurchaseRequestItem(request);
            const rebuilt = fromPurchaseRequestItem(record);

            expect(rebuilt.getStatus()).toBe(PurchaseRequestStatus.COMPLETED);
            expect(rebuilt.getEvidenceKey()).toBe('evidence/request-1.pdf');

            const restoredApproval = rebuilt.getApproval('approval-1');
            expect(restoredApproval.getStatus().status).toBe(
                ApprovalStatus.SIGNED,
            );
            expect(restoredApproval.getStatus().signedAt).toEqual(
                request.getApproval('approval-1').getStatus().signedAt,
            );
        });

        it('should preserve a rejected approval and request', () => {
            const request = createRequest();
            request.rejectApproval('approval-1');

            const record = toPurchaseRequestItem(request);
            const rebuilt = fromPurchaseRequestItem(record);

            expect(rebuilt.getStatus()).toBe(PurchaseRequestStatus.REJECTED);

            const restoredApproval = rebuilt.getApproval('approval-1');
            expect(restoredApproval.getStatus().status).toBe(
                ApprovalStatus.REJECTED,
            );
            expect(restoredApproval.getStatus().rejectedAt).toEqual(
                request.getApproval('approval-1').getStatus().rejectedAt,
            );
        });
    });
});
