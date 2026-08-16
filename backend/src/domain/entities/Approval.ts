import { ApprovalStatus } from './types/approval';

export class Approval {
    constructor(
        public readonly id: string,
        public readonly requestId: string,
        public readonly email: string,
        public readonly role: string,
        public readonly name: string,
        private status: ApprovalStatus = ApprovalStatus.PENDING,
        private signedAt: Date | null = null,
        private rejectedAt: Date | null = null,
    ) {}

    /**
     * Checks if the approval is in a pending state. If not, it throws an error.
     * This method is used to ensure that only pending approvals can be signed or rejected.
     * @throws {Error} If the approval is not in a pending state.
     */
    private checkApprovalPendingStatus() {
        if (this.status !== ApprovalStatus.PENDING) {
            throw new Error('Only pending approvals can be signed or rejected');
        }
    }

    /**
     * Signs the request associated with this approval.
     * @throws {Error} If the approval is not in a pending state.
     */
    public sign() {
        this.checkApprovalPendingStatus();
        this.status = ApprovalStatus.SIGNED;
        this.signedAt = new Date();
    }

    /**
     * Rejects the approval associated with this request.
     * @throws {Error} If the approval is not in a pending state.
     */
    public reject() {
        this.checkApprovalPendingStatus();
        this.status = ApprovalStatus.REJECTED;
        this.rejectedAt = new Date();
    }

    /**
     * Gets the current status of the approval along with the timestamps for when it was signed or rejected.
     * @returns An object containing the current status of the approval, the signedAt timestamp, and the rejectedAt timestamp.
     */
    public getStatus() {
        return {
            status: this.status,
            signedAt: this.signedAt,
            rejectedAt: this.rejectedAt,
        };
    }

    /**
     * Gets the role of the approver associated with this approval.
     * @returns The role of the approver associated with this approval.
     */
    public getRole() {
        return this.role;
    }
}
