import { Approval } from './Approval';
import { ApprovalStatus } from './types/approval';
import { PurchaseRequestStatus, Requester } from './types/requester';

const MAX_APPROVALS = 3;

export class PurchaseRequest {
    constructor(
        public readonly id: string,
        public readonly title: string,
        public readonly description: string,
        public readonly amount: number,
        public readonly requester: Requester,
        public readonly createdAt: Date,
        private readonly approvals: Approval[],
        private status: PurchaseRequestStatus = PurchaseRequestStatus.PENDING,
        private evidenceKey: string | null = null,
    ) {
        this.validateApprovals();
    }

    /**
     * Validates that the purchase request has exactly 3 approvals with unique roles.
     */
    private validateApprovals() {
        if (this.approvals.length !== MAX_APPROVALS) {
            throw new Error(
                `A purchase request must have exactly ${MAX_APPROVALS} approvals`,
            );
        }

        const roles = this.approvals.map((approval) => approval.getRole());
        const uniqueRoles = new Set(roles);

        if (uniqueRoles.size !== MAX_APPROVALS) {
            throw new Error(
                `A purchase request must have exactly ${MAX_APPROVALS} unique roles`,
            );
        }
    }

    /**
     * Gets the current status of the purchase request.
     * @returns The current status of the purchase request.
     */
    public getStatus() {
        return this.status;
    }

    /**
     * Gets the list of approvals associated with the purchase request.
     * @returns The list of approvals associated with the purchase request.
     */
    public getApprovals(): readonly Approval[] {
        return this.approvals;
    }

    /**
     * Gets a specific approval by its ID.
     * @param approvalId The ID of the approval to retrieve.
     * @returns The approval with the specified ID.
     * @throws {Error} If the approval with the specified ID is not found.
     */
    public getApproval(approvalId: string) {
        const approval = this.approvals.find(
            (approval) => approval.id === approvalId,
        );

        if (!approval) {
            throw new Error('Approval not found');
        }
        return approval;
    }

    /**
     * Signs an approval for the purchase request. The request itself is only marked
     * "Completada" once its evidence PDF is generated and attached via `attachEvidence`,
     * even after the third and last approval has been signed here.
     * @param approvalId The ID of the approval to sign.
     */
    public signApproval(approvalId: string) {
        this.checkRequestPendingStatus();

        const approval = this.getApproval(approvalId);
        approval.sign();
    }

    /**
     * Checks whether every approval associated with the purchase request has been signed.
     * @returns True if all approvals are signed, false otherwise.
     */
    public allApprovalsSigned(): boolean {
        return this.approvals.every(
            (approval) => approval.getStatus().status === ApprovalStatus.SIGNED,
        );
    }

    /**
     * Rejects an approval for the purchase request.
     * @param approvalId The ID of the approval to reject.
     */
    public rejectApproval(approvalId: string) {
        this.checkRequestPendingStatus();

        const approval = this.getApproval(approvalId);
        approval.reject();

        this.status = PurchaseRequestStatus.REJECTED;
    }

    /**
     * Gets the storage key of the generated evidence PDF, if any.
     * @returns The evidence key, or null if the evidence PDF has not been generated yet.
     */
    public getEvidenceKey(): string | null {
        return this.evidenceKey;
    }

    /**
     * Attaches the storage key of the generated evidence PDF and completes the purchase request.
     * @param key The storage key of the generated evidence PDF.
     * @throws {Error} If the purchase request is not pending or not every approval has
     * been signed yet.
     */
    public attachEvidence(key: string): void {
        if (
            this.status !== PurchaseRequestStatus.PENDING ||
            !this.allApprovalsSigned()
        ) {
            throw new Error(
                'Evidence can only be attached once all approvals have been signed',
            );
        }
        this.evidenceKey = key;
        this.status = PurchaseRequestStatus.COMPLETED;
    }

    /**
     * Checks if the purchase request is in a pending state.
     * @throws {Error} If the purchase request is not in a pending state.
     */
    private checkRequestPendingStatus() {
        if (this.status !== PurchaseRequestStatus.PENDING) {
            throw new Error('Only pending purchase requests can be modified');
        }
    }
}
