import { Approval } from '../../domain/entities/Approval';
import { PurchaseRequest } from '../../domain/entities/PurchaseRequest';
import { toPurchaseRequestDto } from './purchaseRequest.dto';

export function toApprovalViewDto(
    request: PurchaseRequest,
    approval: Approval,
) {
    return {
        ...toPurchaseRequestDto(request),
        approvalId: approval.id,
    };
}
