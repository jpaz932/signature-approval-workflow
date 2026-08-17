jest.mock('@app/shared', () => {
    const actual =
        jest.requireActual<typeof import('@app/shared')>('@app/shared');
    return { ...actual, listPurchaseRequests: jest.fn() };
});

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { listPurchaseRequests } from '@app/shared';
import type { PurchaseRequest } from '@app/shared';
import { RequestListPage } from '../../src/pages/RequestListPage';

const mockListPurchaseRequests = listPurchaseRequests as jest.Mock;

const sampleRequest: PurchaseRequest = {
    id: 'req-1',
    title: 'Compra de laptops',
    description: '3 laptops para el equipo',
    amount: 1000,
    requester: { name: 'Juan Pérez', email: 'juan@example.com' },
    createdAt: '2026-08-17T10:00:00.000Z',
    status: 'PENDING',
    evidenceAvailable: false,
    approvals: [],
};

function renderPage() {
    return render(
        <MemoryRouter>
            <RequestListPage />
        </MemoryRouter>,
    );
}

describe('RequestListPage', () => {
    beforeEach(() => {
        mockListPurchaseRequests.mockReset();
    });

    it('shows an empty state when there are no requests', async () => {
        mockListPurchaseRequests.mockResolvedValueOnce([]);

        renderPage();

        expect(
            await screen.findByText('Todavía no hay solicitudes.'),
        ).toBeInTheDocument();
    });

    it('renders the request list with status badge and a link to the detail view', async () => {
        mockListPurchaseRequests.mockResolvedValueOnce([sampleRequest]);

        renderPage();

        expect(
            await screen.findByText('Compra de laptops'),
        ).toBeInTheDocument();
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
        expect(screen.getByText('Pendiente')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Ver detalle' }),
        ).toHaveAttribute('href', '/solicitudes/req-1');
    });

    it('shows the backend error message when the request fails', async () => {
        mockListPurchaseRequests.mockRejectedValueOnce(new Error('Boom'));

        renderPage();

        expect(await screen.findByRole('alert')).toHaveTextContent('Boom');
    });

    it('reloads the list when clicking "Actualizar"', async () => {
        mockListPurchaseRequests.mockResolvedValue([]);

        renderPage();
        await screen.findByText('Todavía no hay solicitudes.');

        fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

        expect(mockListPurchaseRequests).toHaveBeenCalledTimes(2);
    });
});
