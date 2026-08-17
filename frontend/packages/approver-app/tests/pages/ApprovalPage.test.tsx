jest.mock('@app/shared', () => {
    const actual =
        jest.requireActual<typeof import('@app/shared')>('@app/shared');
    return {
        ...actual,
        getApprovalSummary: jest.fn(),
        verifyApprovalOtp: jest.fn(),
        signApproval: jest.fn(),
        rejectApproval: jest.fn(),
    };
});

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
    getApprovalSummary,
    rejectApproval,
    signApproval,
    verifyApprovalOtp,
} from '@app/shared';
import type {
    ApprovalSummary,
    ApprovalView,
    PurchaseRequest,
} from '@app/shared';
import { ApprovalPage } from '../../src/pages/ApprovalPage';

const mockGetApprovalSummary = getApprovalSummary as jest.Mock;
const mockVerifyApprovalOtp = verifyApprovalOtp as jest.Mock;
const mockSignApproval = signApproval as jest.Mock;
const mockRejectApproval = rejectApproval as jest.Mock;

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

/** Types one code into the 6 individual OTP digit boxes rendered by react-otp-input. */
async function typeOtpCode(code: string) {
    const digits = await screen.findAllByLabelText(
        /Código de verificación, dígito \d/,
    );
    code.split('').forEach((digit, index) => {
        fireEvent.change(digits[index], { target: { value: digit } });
    });
}

async function reachVerifiedDetail(detail: ApprovalView = verifiedDetail) {
    mockGetApprovalSummary.mockResolvedValueOnce(pendingSummary);
    mockVerifyApprovalOtp.mockResolvedValueOnce(detail);

    renderPage();
    await typeOtpCode('123456');
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }));

    await screen.findByText(detail.description);
}

describe('ApprovalPage', () => {
    beforeEach(() => {
        mockGetApprovalSummary.mockReset();
        mockVerifyApprovalOtp.mockReset();
        mockSignApproval.mockReset();
        mockRejectApproval.mockReset();
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
            screen.getAllByLabelText(/Código de verificación, dígito \d/),
        ).toHaveLength(6);
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
            screen.queryByLabelText(/Código de verificación, dígito \d/),
        ).not.toBeInTheDocument();
    });

    it('verifies the OTP and shows the full request detail on success', async () => {
        mockGetApprovalSummary.mockResolvedValueOnce(pendingSummary);
        mockVerifyApprovalOtp.mockResolvedValueOnce(verifiedDetail);

        renderPage();
        await typeOtpCode('123456');
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
        await typeOtpCode('000000');
        fireEvent.click(
            screen.getByRole('button', { name: 'Verificar código' }),
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Invalid or expired OTP',
        );
    });

    it('shows Aprobar/Rechazar buttons for my own pending approval', async () => {
        await reachVerifiedDetail();

        expect(
            screen.getByRole('button', { name: 'Aprobar' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Rechazar' }),
        ).toBeInTheDocument();
    });

    it('signs the approval and updates the view, hiding the action buttons', async () => {
        await reachVerifiedDetail();
        const signedRequest: PurchaseRequest = {
            ...verifiedDetail,
            approvals: [
                {
                    ...verifiedDetail.approvals[0],
                    status: 'SIGNED',
                    signedAt: '2026-08-17T13:00:00.000Z',
                },
                verifiedDetail.approvals[1],
                verifiedDetail.approvals[2],
            ],
        };
        mockSignApproval.mockResolvedValueOnce(signedRequest);

        fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));

        expect(
            await screen.findByText('Ya aprobaste esta solicitud.'),
        ).toBeInTheDocument();
        expect(mockSignApproval).toHaveBeenCalledWith(
            'req-1',
            'tok-1',
            '123456',
        );
        expect(
            screen.queryByRole('button', { name: 'Aprobar' }),
        ).not.toBeInTheDocument();
    });

    it('rejects the approval and updates the view', async () => {
        await reachVerifiedDetail();
        const rejectedRequest: PurchaseRequest = {
            ...verifiedDetail,
            status: 'REJECTED',
            approvals: [
                {
                    ...verifiedDetail.approvals[0],
                    status: 'REJECTED',
                    rejectedAt: '2026-08-17T13:00:00.000Z',
                },
                verifiedDetail.approvals[1],
                verifiedDetail.approvals[2],
            ],
        };
        mockRejectApproval.mockResolvedValueOnce(rejectedRequest);

        fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));

        expect(
            await screen.findByText('Ya rechazaste esta solicitud.'),
        ).toBeInTheDocument();
        expect(mockRejectApproval).toHaveBeenCalledWith(
            'req-1',
            'tok-1',
            '123456',
        );
    });

    it('shows the backend error message when signing fails, keeping the buttons visible', async () => {
        await reachVerifiedDetail();
        mockSignApproval.mockRejectedValueOnce(
            new Error('Only pending approvals can be signed or rejected'),
        );

        fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Only pending approvals can be signed or rejected',
        );
        expect(
            screen.getByRole('button', { name: 'Aprobar' }),
        ).toBeInTheDocument();
    });

    it('shows the download link once signing completes the request', async () => {
        await reachVerifiedDetail();
        const completedRequest: PurchaseRequest = {
            ...verifiedDetail,
            status: 'COMPLETED',
            evidenceAvailable: true,
            approvals: [
                {
                    ...verifiedDetail.approvals[0],
                    status: 'SIGNED',
                    signedAt: '2026-08-17T13:00:00.000Z',
                },
                verifiedDetail.approvals[1],
                verifiedDetail.approvals[2],
            ],
        };
        mockSignApproval.mockResolvedValueOnce(completedRequest);

        fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));

        expect(
            await screen.findByRole('link', { name: 'Descargar PDF' }),
        ).toHaveAttribute(
            'href',
            expect.stringContaining('/api/solicitudes/req-1/evidencia.pdf'),
        );
    });

    it('does not show action buttons when the request was already closed by another approver', async () => {
        await reachVerifiedDetail({ ...verifiedDetail, status: 'REJECTED' });

        expect(
            screen.getByText(
                'Esta solicitud ya fue cerrada por otro aprobador.',
            ),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Aprobar' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Rechazar' }),
        ).not.toBeInTheDocument();
    });
});
