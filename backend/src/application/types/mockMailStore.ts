export interface MockMailEntry {
    requestId: string;
    approvalId: string;
    email: string;
    subject: string;
    body: string;
    sentAt: Date;
}
