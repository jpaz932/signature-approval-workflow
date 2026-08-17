import { Approval } from '../../domain/entities/Approval';
import { PurchaseRequest } from '../../domain/entities/PurchaseRequest';

/**
 * Minimal info shown before the OTP is verified — enough to render the "enter your OTP"
 * screen without exposing the purchase amount/description yet.
 */
export function toApprovalSummaryDto(
    request: PurchaseRequest,
    approval: Approval,
) {
    return {
        requestId: request.id,
        requestTitle: request.title,
        approverName: approval.name,
        approverRole: approval.role,
        status: approval.getStatus().status,
    };
}
