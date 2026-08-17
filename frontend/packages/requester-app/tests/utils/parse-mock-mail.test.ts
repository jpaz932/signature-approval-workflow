import {
    extractApprovalLink,
    extractOtpCode,
} from '../../src/utils/parse-mock-mail';

const sampleBody =
    'Hola Ana Gomez, tienes una solicitud de compra pendiente por aprobar. ' +
    'Ingresa a este link para revisarla: ' +
    'https://dominio.com/approve?solicitud_id=req-1&approver_token=tok-abc-123. ' +
    'Tu código de verificación es 807885 (válido por 3 minutos).';

describe('extractApprovalLink', () => {
    it('extracts the request id and token from the embedded link', () => {
        expect(extractApprovalLink(sampleBody)).toEqual({
            requestId: 'req-1',
            token: 'tok-abc-123',
        });
    });

    it('returns null when the body has no approval link', () => {
        expect(extractApprovalLink('sin link acá')).toBeNull();
    });
});

describe('extractOtpCode', () => {
    it('extracts the OTP code from the message', () => {
        expect(extractOtpCode(sampleBody)).toBe('807885');
    });

    it('returns null when the body has no OTP code', () => {
        expect(extractOtpCode('sin código acá')).toBeNull();
    });
});
