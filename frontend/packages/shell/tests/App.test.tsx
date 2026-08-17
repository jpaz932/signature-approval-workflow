import { render, screen } from '@testing-library/react';
import { App } from '../src/App';

describe('App', () => {
    it('renders the layout', () => {
        render(<App />);

        expect(
            screen.getByRole('heading', { name: 'Aprobaciones de Compra' }),
        ).toBeInTheDocument();
    });

    it('redirects the root path to /solicitudes', () => {
        render(<App />);

        expect(window.location.pathname).toBe('/solicitudes');
    });

    it('renders navigation links to the requester routes', () => {
        render(<App />);

        expect(
            screen.getByRole('link', { name: 'Solicitudes' }),
        ).toHaveAttribute('href', '/solicitudes');
        expect(
            screen.getByRole('link', { name: 'Nueva solicitud' }),
        ).toHaveAttribute('href', '/solicitudes/nueva');
    });

    it('renders a footer link to the mock-mail viewer', () => {
        render(<App />);

        expect(
            screen.getByRole('link', {
                name: 'Ver bandeja de entrada (mock-mail)',
            }),
        ).toHaveAttribute('href', '/correos');
    });
});
