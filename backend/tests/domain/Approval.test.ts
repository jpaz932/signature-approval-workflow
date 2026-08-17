import { Approval } from '../../src/domain/entities/Approval';
import { ApprovalStatus } from '../../src/domain/entities/types/approval';
import { Otp } from '../../src/domain/value-objects/Otp';

describe('Approval', () => {
    const createApproval = (): Approval => {
        return new Approval(
            'approval-1',
            'request-1',
            'token-1',
            'approver@example.com',
            'MANAGER',
            'Juan Pérez',
            Otp.generate(),
            ApprovalStatus.PENDING,
            null,
            null,
        );
    };

    describe('creation', () => {
        it('should create an approval with pending status', () => {
            const approval = createApproval();

            expect(approval.getStatus()).toEqual({
                status: ApprovalStatus.PENDING,
                signedAt: null,
                rejectedAt: null,
            });
        });

        it('should return the approval role', () => {
            const approval = createApproval();

            expect(approval.getRole()).toBe('MANAGER');
        });
    });

    describe('sign', () => {
        it('should sign a pending approval', () => {
            const approval = createApproval();

            approval.sign();

            const status = approval.getStatus();

            expect(status.status).toBe(ApprovalStatus.SIGNED);
            expect(status.signedAt).toBeInstanceOf(Date);
            expect(status.rejectedAt).toBeNull();
        });

        it('should not allow signing an already signed approval', () => {
            const approval = createApproval();

            approval.sign();

            expect(() => approval.sign()).toThrow(
                'Only pending approvals can be signed or rejected',
            );
        });

        it('should not allow signing a rejected approval', () => {
            const approval = createApproval();

            approval.reject();

            expect(() => approval.sign()).toThrow(
                'Only pending approvals can be signed or rejected',
            );
        });
    });

    describe('reject', () => {
        it('should reject a pending approval', () => {
            const approval = createApproval();

            approval.reject();

            const status = approval.getStatus();

            expect(status.status).toBe(ApprovalStatus.REJECTED);
            expect(status.rejectedAt).toBeInstanceOf(Date);
            expect(status.signedAt).toBeNull();
        });

        it('should not allow rejecting an already rejected approval', () => {
            const approval = createApproval();

            approval.reject();

            expect(() => approval.reject()).toThrow(
                'Only pending approvals can be signed or rejected',
            );
        });

        it('should not allow rejecting a signed approval', () => {
            const approval = createApproval();

            approval.sign();

            expect(() => approval.reject()).toThrow(
                'Only pending approvals can be signed or rejected',
            );
        });
    });

    describe('validateOtp', () => {
        it('should not throw when validating with an invalid code', () => {
            const approval = createApproval();

            // The OTP code is randomly generated, so we can't match it
            // This test verifies that an invalid code throws an error
            expect(() => approval.validateOtp('000000')).toThrow(
                'Invalid or expired OTP',
            );
        });

        it('should throw an error for an expired OTP', async () => {
            // Create an OTP with very short TTL (1 second)
            const otp = Otp.generate(1 / 60);
            const approval = new Approval(
                'approval-1',
                'request-1',
                'token-1',
                'approver@example.com',
                'MANAGER',
                'Juan Pérez',
                otp,
                ApprovalStatus.PENDING,
                null,
                null,
            );

            // Wait for OTP to expire
            await new Promise((resolve) => setTimeout(resolve, 1100));

            // Any code should now be invalid
            expect(() => approval.validateOtp('123456')).toThrow(
                'Invalid or expired OTP',
            );
        });

        it('should throw for an invalid OTP code', () => {
            const otp = Otp.generate();
            const approval = new Approval(
                'approval-1',
                'request-1',
                'token-1',
                'approver@example.com',
                'MANAGER',
                'Juan Pérez',
                otp,
                ApprovalStatus.PENDING,
                null,
                null,
            );

            // Test that invalid code throws
            expect(() => approval.validateOtp('invalid')).toThrow(
                'Invalid or expired OTP',
            );
        });
    });

    describe('getOtp', () => {
        it('should return the OTP code and expiration date', () => {
            const expiresAt = new Date(Date.now() + 60_000);
            const otp = Otp.rehydrate('123456', expiresAt);
            const approval = new Approval(
                'approval-1',
                'request-1',
                'token-1',
                'approver@example.com',
                'MANAGER',
                'Juan Pérez',
                otp,
                ApprovalStatus.PENDING,
                null,
                null,
            );

            expect(approval.getOtp()).toEqual({
                code: '123456',
                expiresAt,
            });
        });
    });

    describe('hasExceededOtpAttempts', () => {
        it('should report false before any failed attempt', () => {
            const approval = createApproval();

            expect(approval.hasExceededOtpAttempts()).toBe(false);
        });

        it('should report false while under the attempt limit', () => {
            const approval = createApproval();

            try {
                approval.validateOtp('wrong-1');
            } catch {
                /* expected */
            }

            expect(approval.hasExceededOtpAttempts()).toBe(false);
        });

        it('should report true once the attempt limit is reached', () => {
            const approval = createApproval();

            for (let i = 0; i < 3; i += 1) {
                try {
                    approval.validateOtp('wrong-code');
                } catch {
                    /* expected */
                }
            }

            expect(approval.hasExceededOtpAttempts()).toBe(true);
        });

        it('should not count successful validations as failed attempts', () => {
            const expiresAt = new Date(Date.now() + 60_000);
            const otp = Otp.rehydrate('123456', expiresAt);
            const approval = new Approval(
                'approval-1',
                'request-1',
                'token-1',
                'approver@example.com',
                'MANAGER',
                'Juan Pérez',
                otp,
            );

            approval.validateOtp('123456');
            approval.validateOtp('123456');

            expect(approval.hasExceededOtpAttempts()).toBe(false);
        });
    });

    describe('hasOtpExpired', () => {
        it('should report false right after creation', () => {
            const approval = createApproval();

            expect(approval.hasOtpExpired()).toBe(false);
        });

        it('should report true once the OTP window has passed', async () => {
            const otp = Otp.generate(1 / 60);
            const approval = new Approval(
                'approval-1',
                'request-1',
                'token-1',
                'approver@example.com',
                'MANAGER',
                'Juan Pérez',
                otp,
            );

            await new Promise((resolve) => setTimeout(resolve, 1100));

            expect(approval.hasOtpExpired()).toBe(true);
        });
    });
});
