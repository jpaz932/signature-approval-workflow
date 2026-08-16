export interface Requester {
    name: string;
    email: string;
}

export enum PurchaseRequestStatus {
    PENDING = 'PENDING',
    REJECTED = 'REJECTED',
    COMPLETED = 'COMPLETED',
}
