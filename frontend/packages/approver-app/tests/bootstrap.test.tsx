jest.mock('@app/shared', () => {
    const actual =
        jest.requireActual<typeof import('@app/shared')>('@app/shared');
    return { ...actual, getApprovalSummary: jest.fn() };
});

import { act } from 'react';
import { getApprovalSummary } from '@app/shared';
import { getRootElement, mount } from '../src/bootstrap';

const mockGetApprovalSummary = getApprovalSummary as jest.Mock;

describe('bootstrap', () => {
    beforeEach(() => {
        mockGetApprovalSummary.mockReset();
        mockGetApprovalSummary.mockResolvedValue({
            requestId: 'req-1',
            requestTitle: 'Compra de laptops',
            approverName: 'Ana Gómez',
            approverRole: 'MANAGER',
            status: 'PENDING',
        });
    });

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
        it('renders the approval page into the root element', () => {
            const root = document.createElement('div');
            root.id = 'root';
            document.body.appendChild(root);

            act(() => {
                mount();
            });

            expect(root.textContent).toContain(
                'Este link de aprobación no es válido.',
            );
        });
    });
});
