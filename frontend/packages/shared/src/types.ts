export type ApprovalStatus = 'PENDING' | 'SIGNED' | 'REJECTED';

export type PurchaseRequestStatus = 'PENDING' | 'COMPLETED' | 'REJECTED';

export interface Requester {
    name: string;
    email: string;
}

export interface ApproverInput {
    name: string;
    email: string;
    role: string;
}

export interface CreatePurchaseRequestInput {
    title: string;
    description: string;
    amount: number;
    requester: Requester;
    approvers: [ApproverInput, ApproverInput, ApproverInput];
}

export interface ApprovalDetail {
    id: string;
    role: string;
    name: string;
    email: string;
    status: ApprovalStatus;
    signedAt: string | null;
    rejectedAt: string | null;
}

export interface PurchaseRequest {
    id: string;
    title: string;
    description: string;
    amount: number;
    requester: Requester;
    createdAt: string;
    status: PurchaseRequestStatus;
    evidenceAvailable: boolean;
    approvals: ApprovalDetail[];
}

export interface ApprovalSummary {
    requestId: string;
    requestTitle: string;
    approverName: string;
    approverRole: string;
    status: ApprovalStatus;
}

export interface ApprovalView extends PurchaseRequest {
    approvalId: string;
}

export interface ErrorResponse {
    message: string;
}
