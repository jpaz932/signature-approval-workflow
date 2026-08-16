import PDFDocument from 'pdfkit';
import { PdfGenerator } from '../../application/ports/PdfGenerator';
import { EvidencePdfData } from '../../application/types/pdfGenerator';

export class PdfKitEvidenceGenerator implements PdfGenerator {
    generate(data: EvidencePdfData): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            doc.fontSize(18).text('Evidencia de aprobación de compra', {
                align: 'center',
            });
            doc.moveDown();

            doc.fontSize(12);
            doc.text(`Solicitud: ${data.requestId}`);
            doc.text(`Título: ${data.title}`);
            doc.text(`Descripción: ${data.description}`);
            doc.text(`Monto: ${data.amount.toLocaleString('es-CO')}`);
            doc.text(`Solicitante: ${data.requesterName}`);
            doc.text(`Fecha de creación: ${data.createdAt.toISOString()}`);
            doc.moveDown();

            doc.fontSize(14).text('Aprobadores', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(12);

            data.approvers.forEach((approver) => {
                const timestamp = approver.signedAt
                    ? approver.signedAt.toISOString()
                    : '-';

                doc.text(
                    `${approver.name} — ${approver.role} — ${approver.status} — ${timestamp}`,
                );
            });

            doc.end();
        });
    }
}
