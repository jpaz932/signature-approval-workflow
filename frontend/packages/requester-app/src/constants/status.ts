import type { ApprovalStatus, PurchaseRequestStatus } from '@app/shared';

export const REQUEST_STATUS_LABEL: Record<PurchaseRequestStatus, string> = {
    PENDING: 'Pendiente',
    COMPLETED: 'Completada',
    REJECTED: 'Rechazada',
};

export const REQUEST_STATUS_BADGE_CLASS: Record<PurchaseRequestStatus, string> =
    {
        PENDING: 'badge-pending',
        COMPLETED: 'badge-completed',
        REJECTED: 'badge-rejected',
    };

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
    PENDING: 'Pendiente',
    SIGNED: 'Firmado',
    REJECTED: 'Rechazado',
};

export const APPROVAL_STATUS_BADGE_CLASS: Record<ApprovalStatus, string> = {
    PENDING: 'badge-pending',
    SIGNED: 'badge-signed',
    REJECTED: 'badge-rejected',
};
