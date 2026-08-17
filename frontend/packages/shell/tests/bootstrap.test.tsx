import { act } from 'react';
import { getRootElement, mount } from '../src/bootstrap';

describe('bootstrap', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('getRootElement', () => {
        it('throws when the root element is missing', () => {
            expect(() => getRootElement()).toThrow('Root element not found');
        });

        it('returns the root element when present', () => {
            const root = document.createElement('div');
            root.id = 'root';
            document.body.appendChild(root);

            expect(getRootElement()).toBe(root);
        });
    });

    describe('mount', () => {
        it('renders the app into the root element', () => {
            const root = document.createElement('div');
            root.id = 'root';
            document.body.appendChild(root);

            act(() => {
                mount();
            });

            expect(root.textContent).toContain('Aprobaciones de Compra');
        });
    });
});
