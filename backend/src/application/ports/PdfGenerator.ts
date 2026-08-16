import { EvidencePdfData } from '../types/pdfGenerator';

export interface PdfGenerator {
    generate(data: EvidencePdfData): Promise<Buffer>;
}
