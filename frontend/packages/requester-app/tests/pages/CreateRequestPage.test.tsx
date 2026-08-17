jest.mock('@app/shared', () => {
    const actual =
        jest.requireActual<typeof import('@app/shared')>('@app/shared');
    return { ...actual, createPurchaseRequest: jest.fn() };
});

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createPurchaseRequest } from '@app/shared';
import type { PurchaseRequest } from '@app/shared';
import { CreateRequestPage } from '../../src/pages/CreateRequestPage';

const mockCreatePurchaseRequest = createPurchaseRequest as jest.Mock;

const sampleCreated: PurchaseRequest = {
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
            status: 'PENDING',
            signedAt: null,
            rejectedAt: null,
        },
        {
            id: 'a3',
            role: 'DIRECTOR',
            name: 'Marta Díaz',
            email: 'marta.diaz@example.com',
            status: 'PENDING',
            signedAt: null,
            rejectedAt: null,
        },
    ],
};

function renderPage() {
    return render(
        <MemoryRouter>
            <CreateRequestPage />
        </MemoryRouter>,
    );
}

// jsdom doesn't implement HTMLFormElement.requestSubmit(), which a native click on a
// <button type="submit"> now routes through; dispatching the submit event directly on
// the form sidesteps that and still exercises the same onSubmit handler.
function submitForm(container: HTMLElement) {
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
}

function fillTextFields() {
    fireEvent.change(screen.getByLabelText('Título'), {
        target: { value: 'Compra de laptops' },
    });
    fireEvent.change(screen.getByLabelText('Descripción'), {
        target: { value: '3 laptops para el equipo' },
    });
    fireEvent.change(screen.getByLabelText('Monto'), {
        target: { value: '1000' },
    });
    fireEvent.change(screen.getByLabelText('Tu nombre'), {
        target: { value: 'Juan Pérez' },
    });
    fireEvent.change(screen.getByLabelText('Tu correo'), {
        target: { value: 'juan@example.com' },
    });
}

function selectApprovers(...names: string[]) {
    names.forEach((name) =>
        fireEvent.click(screen.getByLabelText(new RegExp(name))),
    );
}

function fillValidForm() {
    fillTextFields();
    selectApprovers('Ana Gómez', 'Luis Rojas', 'Marta Díaz');
}

describe('CreateRequestPage', () => {
    beforeEach(() => {
        mockCreatePurchaseRequest.mockReset();
    });

    it('renders the form fields and the approver roster', () => {
        renderPage();

        expect(screen.getByLabelText('Título')).toBeInTheDocument();
        expect(screen.getByLabelText('Descripción')).toBeInTheDocument();
        expect(screen.getByLabelText('Monto')).toBeInTheDocument();
        expect(screen.getByLabelText('Tu nombre')).toBeInTheDocument();
        expect(screen.getByLabelText('Tu correo')).toBeInTheDocument();
        expect(screen.getByText('Aprobadores (0/3)')).toBeInTheDocument();
        expect(screen.getByLabelText(/Ana Gómez/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Jorge Ibarra/)).toBeInTheDocument();
    });

    it('disables the remaining approver checkboxes once 3 are selected', () => {
        renderPage();
        selectApprovers('Ana Gómez', 'Luis Rojas', 'Marta Díaz');

        // Real browsers ignore clicks on disabled form controls; jsdom's fireEvent doesn't
        // reliably emulate that, so we only assert the `disabled` state itself here.
        expect(screen.getByLabelText(/Carlos Peña/)).toBeDisabled();
        expect(screen.getByText('Aprobadores (3/3)')).toBeInTheDocument();
    });

    it('shows a validation error when fewer than 3 approvers are selected', async () => {
        const { container } = renderPage();
        fillTextFields();
        selectApprovers('Ana Gómez', 'Luis Rojas');

        submitForm(container);

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('exactamente 3');
        expect(alert).toHaveClass('form-error');
        expect(mockCreatePurchaseRequest).not.toHaveBeenCalled();
    });

    it('shows a validation error when the amount is not a positive number', async () => {
        const { container } = renderPage();
        fillValidForm();
        fireEvent.change(screen.getByLabelText('Monto'), {
            target: { value: '0' },
        });

        submitForm(container);

        expect(await screen.findByRole('alert')).toHaveTextContent('mayor a 0');
        expect(mockCreatePurchaseRequest).not.toHaveBeenCalled();
    });

    it('submits the form and shows the created request on success', async () => {
        mockCreatePurchaseRequest.mockResolvedValueOnce(sampleCreated);

        const { container } = renderPage();
        fillValidForm();
        submitForm(container);

        expect(await screen.findByText('Solicitud creada')).toBeInTheDocument();
        expect(mockCreatePurchaseRequest).toHaveBeenCalledWith({
            title: 'Compra de laptops',
            description: '3 laptops para el equipo',
            amount: 1000,
            requester: { name: 'Juan Pérez', email: 'juan@example.com' },
            approvers: [
                {
                    name: 'Ana Gómez',
                    email: 'ana.gomez@example.com',
                    role: 'MANAGER',
                },
                {
                    name: 'Luis Rojas',
                    email: 'luis.rojas@example.com',
                    role: 'FINANCE',
                },
                {
                    name: 'Marta Díaz',
                    email: 'marta.diaz@example.com',
                    role: 'DIRECTOR',
                },
            ],
        });
        expect(screen.getByText(/req-1/)).toBeInTheDocument();
    });

    it('shows a link back to the requests list and a button to create another one', async () => {
        mockCreatePurchaseRequest.mockResolvedValueOnce(sampleCreated);

        const { container } = renderPage();
        fillValidForm();
        submitForm(container);
        await screen.findByText('Solicitud creada');

        expect(
            screen.getByRole('link', { name: 'Volver al listado' }),
        ).toHaveAttribute('href', '/solicitudes');

        fireEvent.click(
            screen.getByRole('button', { name: 'Crear otra solicitud' }),
        );

        expect(
            screen.getByRole('button', { name: 'Crear solicitud' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Título')).toHaveValue('');
        expect(screen.getByText('Aprobadores (0/3)')).toBeInTheDocument();
    });

    it('shows the backend error message when the request fails', async () => {
        mockCreatePurchaseRequest.mockRejectedValueOnce(new Error('Boom'));

        const { container } = renderPage();
        fillValidForm();
        submitForm(container);

        expect(await screen.findByRole('alert')).toHaveTextContent('Boom');
    });
});
