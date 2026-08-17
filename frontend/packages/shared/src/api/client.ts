import { AxiosHttpClient } from './axios-http-client';
import type { HttpClient } from './http-client';
import { env } from '../config/env';
import type {
    ApprovalSummary,
    ApprovalView,
    CreatePurchaseRequestInput,
    MockMailEntry,
    PurchaseRequest,
} from '../types';

export const httpClient: HttpClient = new AxiosHttpClient(env.API_BASE_URL);

export function createPurchaseRequest(
    input: CreatePurchaseRequestInput,
): Promise<PurchaseRequest> {
    return httpClient.post<PurchaseRequest>('/api/solicitudes', input);
}

export function listPurchaseRequests(): Promise<PurchaseRequest[]> {
    return httpClient.get<PurchaseRequest[]>('/api/solicitudes');
}

export function getPurchaseRequest(id: string): Promise<PurchaseRequest> {
    return httpClient.get<PurchaseRequest>(`/api/solicitudes/${id}`);
}

/** Direct download URL for the evidence PDF */
export function getEvidencePdfUrl(id: string): string {
    return `${env.API_BASE_URL}/api/solicitudes/${id}/evidencia.pdf`;
}

export function getApprovalSummary(
    requestId: string,
    token: string,
): Promise<ApprovalSummary> {
    return httpClient.get<ApprovalSummary>(
        `/api/approvals/${requestId}/${token}`,
    );
}

export function verifyApprovalOtp(
    requestId: string,
    token: string,
    code: string,
): Promise<ApprovalView> {
    return httpClient.post<ApprovalView>(
        `/api/approvals/${requestId}/${token}/verify-otp`,
        {
            code,
        },
    );
}

export function signApproval(
    requestId: string,
    token: string,
    code: string,
): Promise<PurchaseRequest> {
    return httpClient.post<PurchaseRequest>(
        `/api/approvals/${requestId}/${token}/sign`,
        {
            code,
        },
    );
}

export function rejectApproval(
    requestId: string,
    token: string,
    code: string,
): Promise<PurchaseRequest> {
    return httpClient.post<PurchaseRequest>(
        `/api/approvals/${requestId}/${token}/reject`,
        {
            code,
        },
    );
}

export function listMockMail(): Promise<MockMailEntry[]> {
    return httpClient.get<MockMailEntry[]>('/mock-mail');
}
