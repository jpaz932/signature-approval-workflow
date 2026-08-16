import { Approval } from '../../domain/entities/Approval';

export interface NotificationService {
    sendApprovalNotification(approval: Approval): Promise<void>;
}
