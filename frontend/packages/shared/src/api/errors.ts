import { isAxiosError } from 'axios';
import type { ErrorResponse } from '../types';

const DEFAULT_ERROR_MESSAGE =
    'Ocurrió un error inesperado. Intenta nuevamente.';

/** Extracts the backend's `{ message }` from an axios error, falling back to a generic one. */
export function getErrorMessage(error: unknown): string {
    if (isAxiosError<ErrorResponse>(error)) {
        return error.response?.data?.message ?? DEFAULT_ERROR_MESSAGE;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return DEFAULT_ERROR_MESSAGE;
}
