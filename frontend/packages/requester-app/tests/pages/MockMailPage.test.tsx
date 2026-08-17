jest.mock('@app/shared', () => {
    const actual =
        jest.requireActual<typeof import('@app/shared')>('@app/shared');
    return { ...actual, listMockMail: jest.fn() };
});

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { listMockMail } from '@app/shared';
import type { MockMailEntry } from '@app/shared';
import { MockMailPage } from '../../src/pages/MockMailPage';

const mockListMockMail = listMockMail as jest.Mock;

const entryWithLink: MockMailEntry = {
    requestId: 'req-1',
    approvalId: 'appr-1',
    email: 'ana@example.com',
    subject: 'Solicitud de compra pendiente por aprobar',
    body:
        'Hola Ana Gomez, tienes una solicitud de compra pendiente por aprobar. ' +
        'Ingresa a este link para revisarla: ' +
        'https://dominio.com/approve?solicitud_id=req-1&approver_token=tok-abc. ' +
        'Tu código de verificación es 807885 (válido por 3 minutos).',
    sentAt: '2026-08-17T10:00:00.000Z',
};

function renderPage() {
    return render(
        <MemoryRouter>
            <MockMailPage />
        </MemoryRouter>,
    );
}

describe('MockMailPage', () => {
    beforeEach(() => {
        mockListMockMail.mockReset();
    });

    it('shows an empty state when no mail was sent', async () => {
        mockListMockMail.mockResolvedValueOnce([]);

        renderPage();

        expect(
            await screen.findByText('Todavía no se enviaron correos.'),
        ).toBeInTheDocument();
    });

    it('renders each entry with its parsed OTP code and a working approval link', async () => {
        mockListMockMail.mockResolvedValueOnce([entryWithLink]);

        renderPage();

        expect(await screen.findByText('ana@example.com')).toBeInTheDocument();
        expect(screen.getByText('807885')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Abrir link' }),
        ).toHaveAttribute(
            'href',
            '/approve?solicitud_id=req-1&approver_token=tok-abc',
        );
    });

    it('shows the backend error message when loading fails', async () => {
        mockListMockMail.mockRejectedValueOnce(new Error('Boom'));

        renderPage();

        expect(await screen.findByRole('alert')).toHaveTextContent('Boom');
    });

    it('reloads the list when clicking "Actualizar"', async () => {
        mockListMockMail.mockResolvedValue([]);

        renderPage();
        await screen.findByText('Todavía no se enviaron correos.');

        fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

        expect(mockListMockMail).toHaveBeenCalledTimes(2);
    });
});
