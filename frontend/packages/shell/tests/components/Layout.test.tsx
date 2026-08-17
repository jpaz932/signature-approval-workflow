import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '../../src/components/Layout';

describe('Layout', () => {
    it('marks only "Solicitudes" as active on the requests list route', () => {
        render(
            <MemoryRouter initialEntries={['/solicitudes']}>
                <Layout>{null}</Layout>
            </MemoryRouter>,
        );

        expect(screen.getByRole('link', { name: 'Solicitudes' })).toHaveClass(
            'active',
        );
        expect(
            screen.getByRole('link', { name: 'Nueva solicitud' }),
        ).not.toHaveClass('active');
    });

    it('marks only "Nueva solicitud" as active on the create-request route, not "Solicitudes" too', () => {
        render(
            <MemoryRouter initialEntries={['/solicitudes/nueva']}>
                <Layout>{null}</Layout>
            </MemoryRouter>,
        );

        expect(
            screen.getByRole('link', { name: 'Nueva solicitud' }),
        ).toHaveClass('active');
        expect(
            screen.getByRole('link', { name: 'Solicitudes' }),
        ).not.toHaveClass('active');
    });
});
