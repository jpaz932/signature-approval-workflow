import {
    APPROVAL_STATUS_BADGE_CLASS,
    APPROVAL_STATUS_LABEL,
    REQUEST_STATUS_BADGE_CLASS,
    REQUEST_STATUS_LABEL,
} from '../../src/constants/status';
import type { ApprovalStatus, PurchaseRequestStatus } from '../../src/types';

const REQUEST_STATUSES: PurchaseRequestStatus[] = [
    'PENDING',
    'COMPLETED',
    'REJECTED',
];
const APPROVAL_STATUSES: ApprovalStatus[] = ['PENDING', 'SIGNED', 'REJECTED'];

describe('status labels and badge classes', () => {
    it('has a label and a badge class for every purchase request status', () => {
        for (const status of REQUEST_STATUSES) {
            expect(REQUEST_STATUS_LABEL[status]).toEqual(expect.any(String));
            expect(REQUEST_STATUS_BADGE_CLASS[status]).toEqual(
                expect.any(String),
            );
        }
    });

    it('has a label and a badge class for every approval status', () => {
        for (const status of APPROVAL_STATUSES) {
            expect(APPROVAL_STATUS_LABEL[status]).toEqual(expect.any(String));
            expect(APPROVAL_STATUS_BADGE_CLASS[status]).toEqual(
                expect.any(String),
            );
        }
    });
});
