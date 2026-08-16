import { PdfKitEvidenceGenerator } from '../../../src/infraestructure/pdf/PdfKitEvidenceGenerator';
import { EvidencePdfData } from '../../../src/application/types/pdfGenerator';

const createPdfData = (): EvidencePdfData => ({
    requestId: 'request-1',
    title: 'Compra de equipos',
    description: 'Compra de tres monitores',
    amount: 1500000,
    requesterName: 'Juan Pérez',
    createdAt: new Date('2026-08-16T00:00:00.000Z'),
    approvers: [
        {
            name: 'Ana Gómez',
            role: 'MANAGER',
            status: 'SIGNED',
            signedAt: new Date('2026-08-16T10:00:00.000Z'),
        },
        {
            name: 'Luis Rojas',
            role: 'FINANCE',
            status: 'SIGNED',
            signedAt: new Date('2026-08-16T11:00:00.000Z'),
        },
        {
            name: 'Marta Díaz',
            role: 'DIRECTOR',
            status: 'SIGNED',
            signedAt: new Date('2026-08-16T12:00:00.000Z'),
        },
    ],
});

describe('PdfKitEvidenceGenerator', () => {
    it('should generate a non-empty PDF buffer', async () => {
        const generator = new PdfKitEvidenceGenerator();

        const pdf = await generator.generate(createPdfData());

        expect(Buffer.isBuffer(pdf)).toBe(true);
        expect(pdf.length).toBeGreaterThan(0);
    });

    it('should produce a buffer with a valid PDF header', async () => {
        const generator = new PdfKitEvidenceGenerator();

        const pdf = await generator.generate(createPdfData());

        expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    });
});
