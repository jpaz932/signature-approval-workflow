import { PurchaseRequest } from '../../domain/entities/PurchaseRequest';

export interface PurchaseRequestRepository {
    save(request: PurchaseRequest): Promise<void>;
    findById(id: string): Promise<PurchaseRequest | null>;
    findAll(): Promise<PurchaseRequest[]>;
}
