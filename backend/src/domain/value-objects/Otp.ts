import { randomInt } from 'node:crypto';

export class Otp {
    private constructor(
        private readonly code: string,
        private readonly expiresAt: Date,
    ) {}

    /**
     * Generates a new OTP code, valid for the given TTL (in minutes).
     * @param ttlMinutes Time-to-live in minutes. Defaults to 3, per the approval flow spec.
     */
    public static generate(ttlMinutes = 3): Otp {
        const code = randomInt(100000, 1000000).toString();
        const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
        return new Otp(code, expiresAt);
    }

    /**
     * Reconstructs a previously generated OTP from persisted values, without generating a
     * new code. Used by repository adapters when loading a purchase request back from
     * storage, so the same OTP that was issued to the approver survives the round trip.
     * @param code The previously generated OTP code.
     * @param expiresAt The previously computed expiration date.
     */
    public static rehydrate(code: string, expiresAt: Date): Otp {
        return new Otp(code, expiresAt);
    }

    /**
     * Checks whether the given code matches and the OTP has not expired.
     * @param code The OTP code to validate.
     * @returns True if the code matches and the OTP has not expired, false otherwise.
     */
    public isValid(code: string): boolean {
        return this.code === code && new Date() < this.expiresAt;
    }

    /**
     * Gets the OTP code.
     * @returns The OTP code.
     */
    public getCode(): string {
        return this.code;
    }

    /**
     * Gets the expiration date of the OTP.
     * @returns The expiration date of the OTP.
     */
    public getExpiresAt(): Date {
        return this.expiresAt;
    }
}
