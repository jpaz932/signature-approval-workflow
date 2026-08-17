import { formatAmount, formatDate } from '../../src/utils/format';

describe('formatAmount', () => {
    it('formats a number as Colombian pesos with no decimals', () => {
        expect(formatAmount(12000000)).toContain('12.000.000');
    });
});

describe('formatDate', () => {
    it('formats an ISO string as a localized date', () => {
        const formatted = formatDate('2026-08-17T10:00:00.000Z');

        expect(formatted).toMatch(/2026/);
    });
});
