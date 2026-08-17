import {
    createPurchaseRequest,
    getApprovalSummary,
    getEvidencePdfUrl,
    getPurchaseRequest,
    httpClient,
    listMockMail,
    listPurchaseRequests,
    rejectApproval,
    signApproval,
    verifyApprovalOtp,
} from '../../src/api/client';
import type {
    CreatePurchaseRequestInput,
    PurchaseRequest,
} from '../../src/types';

const samplePurchaseRequest: PurchaseRequest = {
    id: 'req-1',
    title: 'Compra de laptops',
    description: '3 laptops para el equipo',
    amount: 12000000,
    requester: { name: 'Juan Pérez', email: 'juan@example.com' },
    createdAt: '2026-08-17T10:00:00.000Z',
    status: 'PENDING',
    evidenceAvailable: false,
    approvals: [],
};

describe('api client', () => {
    let getSpy: jest.SpyInstance;
    let postSpy: jest.SpyInstance;

    beforeEach(() => {
        getSpy = jest.spyOn(httpClient, 'get');
        postSpy = jest.spyOn(httpClient, 'post');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('createPurchaseRequest posts to /api/solicitudes and returns the created request', async () => {
        postSpy.mockResolvedValueOnce(samplePurchaseRequest);
        const input: CreatePurchaseRequestInput = {
            title: samplePurchaseRequest.title,
            description: samplePurchaseRequest.description,
            amount: samplePurchaseRequest.amount,
            requester: samplePurchaseRequest.requester,
            approvers: [
                { name: 'Ana', email: 'ana@example.com', role: 'MANAGER' },
                { name: 'Luis', email: 'luis@example.com', role: 'FINANCE' },
                { name: 'Marta', email: 'marta@example.com', role: 'DIRECTOR' },
            ],
        };

        const result = await createPurchaseRequest(input);

        expect(postSpy).toHaveBeenCalledWith('/api/solicitudes', input);
        expect(result).toEqual(samplePurchaseRequest);
    });

    it('listPurchaseRequests gets /api/solicitudes and returns the list', async () => {
        getSpy.mockResolvedValueOnce([samplePurchaseRequest]);

        const result = await listPurchaseRequests();

        expect(getSpy).toHaveBeenCalledWith('/api/solicitudes');
        expect(result).toEqual([samplePurchaseRequest]);
    });

    it('getPurchaseRequest gets /api/solicitudes/{id}', async () => {
        getSpy.mockResolvedValueOnce(samplePurchaseRequest);

        const result = await getPurchaseRequest('req-1');

        expect(getSpy).toHaveBeenCalledWith('/api/solicitudes/req-1');
        expect(result).toEqual(samplePurchaseRequest);
    });

    it('getEvidencePdfUrl builds the download URL without calling the http client', () => {
        const url = getEvidencePdfUrl('req-1');

        expect(url).toMatch(/\/api\/solicitudes\/req-1\/evidencia\.pdf$/);
        expect(getSpy).not.toHaveBeenCalled();
        expect(postSpy).not.toHaveBeenCalled();
    });

    it('getApprovalSummary gets /api/approvals/{id}/{token}', async () => {
        const summary = {
            requestId: 'req-1',
            requestTitle: samplePurchaseRequest.title,
            approverName: 'Ana',
            approverRole: 'MANAGER',
            status: 'PENDING' as const,
        };
        getSpy.mockResolvedValueOnce(summary);

        const result = await getApprovalSummary('req-1', 'token-abc');

        expect(getSpy).toHaveBeenCalledWith('/api/approvals/req-1/token-abc');
        expect(result).toEqual(summary);
    });

    it('verifyApprovalOtp posts the code to the verify-otp endpoint', async () => {
        const view = { ...samplePurchaseRequest, approvalId: 'appr-1' };
        postSpy.mockResolvedValueOnce(view);

        const result = await verifyApprovalOtp('req-1', 'token-abc', '123456');

        expect(postSpy).toHaveBeenCalledWith(
            '/api/approvals/req-1/token-abc/verify-otp',
            {
                code: '123456',
            },
        );
        expect(result).toEqual(view);
    });

    it('signApproval posts the code to the sign endpoint', async () => {
        postSpy.mockResolvedValueOnce(samplePurchaseRequest);

        const result = await signApproval('req-1', 'token-abc', '123456');

        expect(postSpy).toHaveBeenCalledWith(
            '/api/approvals/req-1/token-abc/sign',
            {
                code: '123456',
            },
        );
        expect(result).toEqual(samplePurchaseRequest);
    });

    it('rejectApproval posts the code to the reject endpoint', async () => {
        postSpy.mockResolvedValueOnce(samplePurchaseRequest);

        const result = await rejectApproval('req-1', 'token-abc', '123456');

        expect(postSpy).toHaveBeenCalledWith(
            '/api/approvals/req-1/token-abc/reject',
            {
                code: '123456',
            },
        );
        expect(result).toEqual(samplePurchaseRequest);
    });

    it('listMockMail gets /mock-mail and returns the list', async () => {
        const entries = [
            {
                requestId: 'req-1',
                approvalId: 'appr-1',
                email: 'ana@example.com',
                subject: 'Solicitud de compra pendiente por aprobar',
                body: 'Hola Ana, ... https://dominio.com/approve?solicitud_id=req-1&approver_token=tok-1 ... 123456 ...',
                sentAt: '2026-08-17T10:00:00.000Z',
            },
        ];
        getSpy.mockResolvedValueOnce(entries);

        const result = await listMockMail();

        expect(getSpy).toHaveBeenCalledWith('/mock-mail');
        expect(result).toEqual(entries);
    });
});
