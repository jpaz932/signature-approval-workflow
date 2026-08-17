import { ApprovalStatus } from './types/approval';
import { Otp } from '../value-objects/Otp';

export class Approval {
    /** Max wrong OTP guesses allowed before the approval (and request) auto-reject. */
    private static readonly MAX_OTP_ATTEMPTS = 3;

    constructor(
        public readonly id: string,
        public readonly requestId: string,
        public readonly token: string,
        public readonly email: string,
        public readonly role: string,
        public readonly name: string,
        private readonly otp: Otp,
        private status: ApprovalStatus = ApprovalStatus.PENDING,
        private signedAt: Date | null = null,
        private rejectedAt: Date | null = null,
        private failedOtpAttempts = 0,
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

    /**
     * Validates the provided OTP code against the stored OTP for this approval. Every
     * wrong guess is counted; once the count reaches the limit, callers should reject
     * the request instead of allowing further attempts (see `hasExceededOtpAttempts`).
     * @param code The OTP code to validate.
     * @throws {Error} If the OTP is invalid or has expired.
     */
    public validateOtp(code: string) {
        if (this.otp.isValid(code)) {
            return;
        }
        this.failedOtpAttempts += 1;
        throw new Error('Invalid or expired OTP');
    }

    /**
     * Checks whether the number of failed OTP attempts has reached the allowed limit.
     * @returns True if no further OTP attempts should be allowed.
     */
    public hasExceededOtpAttempts(): boolean {
        return this.failedOtpAttempts >= Approval.MAX_OTP_ATTEMPTS;
    }

    /**
     * Checks whether the current OTP's validity window has passed, regardless of
     * whether it was ever used.
     * @returns True if the OTP has expired.
     */
    public hasOtpExpired(): boolean {
        return new Date() >= this.otp.getExpiresAt();
    }

    /**
     * Gets the OTP code and its expiration date.
     * @returns An object containing the OTP code and its expiration date.
     */
    public getOtp(): { code: string; expiresAt: Date } {
        return {
            code: this.otp.getCode(),
            expiresAt: this.otp.getExpiresAt(),
        };
    }

    /**
     * Gets the number of failed OTP attempts recorded so far, for persistence.
     * @returns The number of failed OTP attempts.
     */
    public getFailedOtpAttempts(): number {
        return this.failedOtpAttempts;
    }
}
