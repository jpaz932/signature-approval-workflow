import { Requester } from '../../../domain/entities/types/requester';

interface ApproverInput {
    email: string;
    name: string;
    role: string;
}

export interface CreatePurchaseRequestInput {
    title: string;
    description: string;
    amount: number;
    requester: Requester;
    approvers: ApproverInput[];
}
