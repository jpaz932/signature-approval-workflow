import { Approval } from '../../domain/entities/Approval';
import { PurchaseRequest } from '../../domain/entities/PurchaseRequest';
import { Otp } from '../../domain/value-objects/Otp';
import { PurchaseRequestRecord } from '../types/dynamoPurchaseRequest';

/**
 * Converts a PurchaseRequest aggregate (and its approvals) into a plain, JSON-serializable
 * record suitable for persistence.
 */
export function toPurchaseRequestItem(
    request: PurchaseRequest,
): PurchaseRequestRecord {
    return {
        id: request.id,
        title: request.title,
        description: request.description,
        amount: request.amount,
        requester: request.requester,
        createdAt: request.createdAt.toISOString(),
        status: request.getStatus(),
        evidenceKey: request.getEvidenceKey(),
        approvals: request.getApprovals().map((approval) => {
            const status = approval.getStatus();

            return {
                id: approval.id,
                requestId: approval.requestId,
                token: approval.token,
                email: approval.email,
                role: approval.role,
                name: approval.name,
                otpCode: approval.getOtp().code,
                otpExpiresAt: approval.getOtp().expiresAt.toISOString(),
                status: status.status,
                signedAt: status.signedAt
                    ? status.signedAt.toISOString()
                    : null,
                rejectedAt: status.rejectedAt
                    ? status.rejectedAt.toISOString()
                    : null,
                failedOtpAttempts: approval.getFailedOtpAttempts(),
            };
        }),
    };
}

/**
 * Reconstructs a PurchaseRequest aggregate (and its approvals) from a persisted record.
 */
export function fromPurchaseRequestItem(
    record: PurchaseRequestRecord,
): PurchaseRequest {
    const approvals = record.approvals.map(
        (approval) =>
            new Approval(
                approval.id,
                approval.requestId,
                approval.token,
                approval.email,
                approval.role,
                approval.name,
                Otp.rehydrate(
                    approval.otpCode,
                    new Date(approval.otpExpiresAt),
                ),
                approval.status,
                approval.signedAt ? new Date(approval.signedAt) : null,
                approval.rejectedAt ? new Date(approval.rejectedAt) : null,
                approval.failedOtpAttempts,
            ),
    );

    return new PurchaseRequest(
        record.id,
        record.title,
        record.description,
        record.amount,
        record.requester,
        new Date(record.createdAt),
        approvals,
        record.status,
        record.evidenceKey,
    );
}
