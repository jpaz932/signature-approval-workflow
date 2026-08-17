jest.mock('axios', () => ({
    __esModule: true,
    default: { create: jest.fn(() => ({ get: jest.fn(), post: jest.fn() })) },
    isAxiosError: jest.fn(),
}));

import { isAxiosError } from 'axios';
import { getErrorMessage } from '../../src/api/errors';

const mockIsAxiosError = isAxiosError as unknown as jest.Mock;

describe('getErrorMessage', () => {
    afterEach(() => {
        mockIsAxiosError.mockReset();
    });

    it('returns the backend message from an axios error response', () => {
        mockIsAxiosError.mockReturnValue(true);
        const error = {
            response: { data: { message: 'Invalid or expired OTP' } },
        };

        expect(getErrorMessage(error)).toBe('Invalid or expired OTP');
    });

    it('falls back to a generic message when the axios error has no response body', () => {
        mockIsAxiosError.mockReturnValue(true);
        const error = { response: undefined };

        expect(getErrorMessage(error)).toBe(
            'Ocurrió un error inesperado. Intenta nuevamente.',
        );
    });

    it('returns the message of a plain Error', () => {
        mockIsAxiosError.mockReturnValue(false);

        expect(getErrorMessage(new Error('boom'))).toBe('boom');
    });

    it('falls back to a generic message for unknown thrown values', () => {
        mockIsAxiosError.mockReturnValue(false);

        expect(getErrorMessage('nope')).toBe(
            'Ocurrió un error inesperado. Intenta nuevamente.',
        );
    });
});
