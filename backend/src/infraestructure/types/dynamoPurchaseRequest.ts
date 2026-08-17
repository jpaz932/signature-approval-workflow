import { ApprovalStatus } from '../../domain/entities/types/approval';
import {
    PurchaseRequestStatus,
    Requester,
} from '../../domain/entities/types/requester';

interface ApprovalRecord {
    id: string;
    requestId: string;
    token: string;
    email: string;
    role: string;
    name: string;
    otpCode: string;
    otpExpiresAt: string;
    status: ApprovalStatus;
    signedAt: string | null;
    rejectedAt: string | null;
    failedOtpAttempts: number;
}

export interface PurchaseRequestRecord {
    id: string;
    title: string;
    description: string;
    amount: number;
    requester: Requester;
    createdAt: string;
    status: PurchaseRequestStatus;
    evidenceKey: string | null;
    approvals: ApprovalRecord[];
}
