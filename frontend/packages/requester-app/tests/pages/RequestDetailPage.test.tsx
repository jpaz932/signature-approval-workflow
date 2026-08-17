jest.mock('@app/shared', () => {
    const actual =
        jest.requireActual<typeof import('@app/shared')>('@app/shared');
    return { ...actual, getPurchaseRequest: jest.fn() };
});

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getPurchaseRequest } from '@app/shared';
import type { PurchaseRequest } from '@app/shared';
import { RequestDetailPage } from '../../src/pages/RequestDetailPage';

const mockGetPurchaseRequest = getPurchaseRequest as jest.Mock;

const baseRequest: PurchaseRequest = {
    id: 'req-1',
    title: 'Compra de laptops',
    description: '3 laptops para el equipo',
    amount: 1000,
    requester: { name: 'Juan Pérez', email: 'juan@example.com' },
    createdAt: '2026-08-17T10:00:00.000Z',
    status: 'PENDING',
    evidenceAvailable: false,
    approvals: [
        {
            id: 'a1',
            role: 'MANAGER',
            name: 'Ana Gómez',
            email: 'ana.gomez@example.com',
            status: 'PENDING',
            signedAt: null,
            rejectedAt: null,
        },
        {
            id: 'a2',
            role: 'FINANCE',
            name: 'Luis Rojas',
            email: 'luis.rojas@example.com',
            status: 'SIGNED',
            signedAt: '2026-08-17T12:00:00.000Z',
            rejectedAt: null,
        },
        {
            id: 'a3',
            role: 'DIRECTOR',
            name: 'Marta Díaz',
            email: 'marta.diaz@example.com',
            status: 'REJECTED',
            signedAt: null,
            rejectedAt: '2026-08-17T13:00:00.000Z',
        },
    ],
};

function renderPage(requestId = 'req-1') {
    return render(
        <MemoryRouter initialEntries={[`/solicitudes/${requestId}`]}>
            <Routes>
                <Route
                    path="/solicitudes/:id"
                    element={<RequestDetailPage />}
                />
            </Routes>
        </MemoryRouter>,
    );
}

describe('RequestDetailPage', () => {
    beforeEach(() => {
        mockGetPurchaseRequest.mockReset();
    });

    it('fetches the request by the id in the route and renders its approvals', async () => {
        mockGetPurchaseRequest.mockResolvedValueOnce(baseRequest);

        renderPage('req-1');

        expect(
            await screen.findByRole('heading', { name: 'Compra de laptops' }),
        ).toBeInTheDocument();
        expect(mockGetPurchaseRequest).toHaveBeenCalledWith('req-1');
        expect(screen.getByText('Ana Gómez')).toBeInTheDocument();
        expect(screen.getByText('Firmado')).toBeInTheDocument();
        expect(screen.getByText('Rechazado')).toBeInTheDocument();
    });

    it('does not show the download button when evidence is not available yet', async () => {
        mockGetPurchaseRequest.mockResolvedValueOnce(baseRequest);

        renderPage();

        await screen.findByRole('heading', { name: 'Compra de laptops' });
        expect(
            screen.queryByRole('link', { name: 'Descargar PDF' }),
        ).not.toBeInTheDocument();
    });

    it('shows the download link once the request is completed with evidence', async () => {
        mockGetPurchaseRequest.mockResolvedValueOnce({
            ...baseRequest,
            status: 'COMPLETED',
            evidenceAvailable: true,
        });

        renderPage();

        const link = await screen.findByRole('link', { name: 'Descargar PDF' });
        expect(link).toHaveAttribute(
            'href',
            expect.stringContaining('/api/solicitudes/req-1/evidencia.pdf'),
        );
    });

    it('shows the backend error message when the request fails', async () => {
        mockGetPurchaseRequest.mockRejectedValueOnce(new Error('Boom'));

        renderPage();

        expect(await screen.findByRole('alert')).toHaveTextContent('Boom');
    });

    it('reloads the request when clicking "Actualizar"', async () => {
        mockGetPurchaseRequest.mockResolvedValue(baseRequest);

        renderPage();
        await screen.findByRole('heading', { name: 'Compra de laptops' });

        fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

        expect(mockGetPurchaseRequest).toHaveBeenCalledTimes(2);
    });
});
