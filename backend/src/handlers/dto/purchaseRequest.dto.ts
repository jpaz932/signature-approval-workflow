import { PurchaseRequest } from '../../domain/entities/PurchaseRequest';
import { toApprovalDetailDto } from './approvalDetail.dto';

export function toPurchaseRequestDto(request: PurchaseRequest) {
    return {
        id: request.id,
        title: request.title,
        description: request.description,
        amount: request.amount,
        requester: request.requester,
        createdAt: request.createdAt,
        status: request.getStatus(),
        evidenceAvailable: request.getEvidenceKey() !== null,
        approvals: request.getApprovals().map(toApprovalDetailDto),
    };
}
