export interface ParsedApprovalLink {
    requestId: string;
    token: string;
}

/** Extracts the approve-link query params embedded in a mock-mail body's free text. */
export function extractApprovalLink(body: string): ParsedApprovalLink | null {
    const match = /solicitud_id=([^&\s]+)&approver_token=([^.\s]+)/.exec(body);
    if (!match) {
        return null;
    }
    return { requestId: match[1], token: match[2] };
}

/** Extracts the OTP code embedded in a mock-mail body's free text. */
export function extractOtpCode(body: string): string | null {
    const match = /c[oó]digo de verificaci[oó]n es (\d+)/i.exec(body);
    return match ? match[1] : null;
}
