export interface EvidencePdfApprover {
    name: string;
    role: string;
    status: string;
    signedAt: Date | null;
}

export interface EvidencePdfData {
    requestId: string;
    title: string;
    description: string;
    amount: number;
    requesterName: string;
    createdAt: Date;
    approvers: EvidencePdfApprover[];
}

export interface PdfGenerator {
    generate(data: EvidencePdfData): Promise<Buffer>;
}
