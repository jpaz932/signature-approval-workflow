jest.mock('@app/shared', () => {
    const actual =
        jest.requireActual<typeof import('@app/shared')>('@app/shared');
    return {
        ...actual,
        getApprovalSummary: jest.fn(),
        verifyApprovalOtp: jest.fn(),
    };
});

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getApprovalSummary, verifyApprovalOtp } from '@app/shared';
import type { ApprovalSummary, ApprovalView } from '@app/shared';
import { ApprovalPage } from '../../src/pages/ApprovalPage';

const mockGetApprovalSummary = getApprovalSummary as jest.Mock;
const mockVerifyApprovalOtp = verifyApprovalOtp as jest.Mock;

const pendingSummary: ApprovalSummary = {
    requestId: 'req-1',
    requestTitle: 'Compra de laptops',
    approverName: 'Ana Gómez',
    approverRole: 'MANAGER',
    status: 'PENDING',
};

const verifiedDetail: ApprovalView = {
    id: 'req-1',
    approvalId: 'appr-1',
    title: 'Compra de laptops',
    description: '3 laptops para el equipo',
    amount: 1000,
    requester: { name: 'Juan Pérez', email: 'juan@example.com' },
    createdAt: '2026-08-17T10:00:00.000Z',
    status: 'PENDING',
    evidenceAvailable: false,
    approvals: [
        {
            id: 'appr-1',
            role: 'MANAGER',
            name: 'Ana Gómez',
            email: 'ana.gomez@example.com',
            status: 'PENDING',
            signedAt: null,
            rejectedAt: null,
        },
        {
            id: 'appr-2',
            role: 'FINANCE',
            name: 'Luis Rojas',
            email: 'luis.rojas@example.com',
            status: 'SIGNED',
            signedAt: '2026-08-17T12:00:00.000Z',
            rejectedAt: null,
        },
        {
            id: 'appr-3',
            role: 'DIRECTOR',
            name: 'Marta Díaz',
            email: 'marta.diaz@example.com',
            status: 'PENDING',
            signedAt: null,
            rejectedAt: null,
        },
    ],
};

function renderPage(query = 'solicitud_id=req-1&approver_token=tok-1') {
    return render(
        <MemoryRouter initialEntries={[`/approve?${query}`]}>
            <ApprovalPage />
        </MemoryRouter>,
    );
}

describe('ApprovalPage', () => {
    beforeEach(() => {
        mockGetApprovalSummary.mockReset();
        mockVerifyApprovalOtp.mockReset();
    });

    it('shows an error when the link is missing solicitud_id or approver_token', () => {
        renderPage('');

        expect(screen.getByRole('alert')).toHaveTextContent('no es válido');
        expect(mockGetApprovalSummary).not.toHaveBeenCalled();
    });

    it('loads the summary and shows the OTP form with the approver name and role', async () => {
        mockGetApprovalSummary.mockResolvedValueOnce(pendingSummary);

        renderPage();

        expect(
            await screen.findByRole('heading', { name: 'Compra de laptops' }),
        ).toBeInTheDocument();
        expect(mockGetApprovalSummary).toHaveBeenCalledWith('req-1', 'tok-1');
        expect(screen.getByText(/Ana Gómez/)).toBeInTheDocument();
        expect(
            screen.getByLabelText('Código de verificación'),
        ).toBeInTheDocument();
    });

    it('shows the backend error message when loading the summary fails', async () => {
        mockGetApprovalSummary.mockRejectedValueOnce(new Error('Boom'));

        renderPage();

        expect(await screen.findByRole('alert')).toHaveTextContent('Boom');
    });

    it('shows a closed message instead of the OTP form when the approval is no longer pending', async () => {
        mockGetApprovalSummary.mockResolvedValueOnce({
            ...pendingSummary,
            status: 'REJECTED',
        });

        renderPage();

        expect(
            await screen.findByText('Esta aprobación ya no está pendiente.'),
        ).toBeInTheDocument();
        expect(
            screen.queryByLabelText('Código de verificación'),
        ).not.toBeInTheDocument();
    });

    it('verifies the OTP and shows the full request detail on success', async () => {
        mockGetApprovalSummary.mockResolvedValueOnce(pendingSummary);
        mockVerifyApprovalOtp.mockResolvedValueOnce(verifiedDetail);

        renderPage();
        fireEvent.change(
            await screen.findByLabelText('Código de verificación'),
            {
                target: { value: '123456' },
            },
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Verificar código' }),
        );

        expect(
            await screen.findByText('3 laptops para el equipo'),
        ).toBeInTheDocument();
        expect(mockVerifyApprovalOtp).toHaveBeenCalledWith(
            'req-1',
            'tok-1',
            '123456',
        );
        expect(screen.getByText('Luis Rojas')).toBeInTheDocument();
        expect(screen.getByText('Firmado')).toBeInTheDocument();
    });

    it('shows the backend error message when OTP verification fails', async () => {
        mockGetApprovalSummary.mockResolvedValueOnce(pendingSummary);
        mockVerifyApprovalOtp.mockRejectedValueOnce(
            new Error('Invalid or expired OTP'),
        );

        renderPage();
        fireEvent.change(
            await screen.findByLabelText('Código de verificación'),
            {
                target: { value: '000000' },
            },
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Verificar código' }),
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Invalid or expired OTP',
        );
    });
});
