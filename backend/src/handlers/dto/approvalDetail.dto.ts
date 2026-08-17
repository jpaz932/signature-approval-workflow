import { Approval } from '../../domain/entities/Approval';

export function toApprovalDetailDto(approval: Approval) {
    const status = approval.getStatus();

    return {
        id: approval.id,
        role: approval.role,
        name: approval.name,
        email: approval.email,
        status: status.status,
        signedAt: status.signedAt,
        rejectedAt: status.rejectedAt,
    };
}
