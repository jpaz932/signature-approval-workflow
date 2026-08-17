import { CreatePurchaseRequestUseCase } from '../application/use-cases/CreatePurchaseRequest';
import { GeneratePurchaseEvidenceUseCase } from '../application/use-cases/GeneratePurchaseEvidence';
import { GetApprovalUseCase } from '../application/use-cases/GetApproval';
import { GetEvidencePdfUseCase } from '../application/use-cases/GetEvidencePdf';
import { GetPurchaseRequestUseCase } from '../application/use-cases/GetPurchaseRequest';
import { ListMockMailUseCase } from '../application/use-cases/ListMockMail';
import { ListPurchaseRequestsUseCase } from '../application/use-cases/ListPurchaseRequests';
import { RejectApprovalUseCase } from '../application/use-cases/RejectApproval';
import { SignApprovalUseCase } from '../application/use-cases/SignApproval';
import { VerifyApprovalOtpUseCase } from '../application/use-cases/VerifyApprovalOtp';
import { envs } from './config/envs';
import { MockNotificationService } from './notifications/MockNotificationService';
import { PdfKitEvidenceGenerator } from './pdf/PdfKitEvidenceGenerator';
import { DynamoMockMailStore } from './persistence/DynamoMockMailStore';
import { DynamoPurchaseRequestRepository } from './persistence/DynamoPurchaseRequestRepository';
import { S3EvidenceStorage } from './storage/S3EvidenceStorage';

export interface Dependencies {
    createPurchaseRequest: CreatePurchaseRequestUseCase;
    listPurchaseRequests: ListPurchaseRequestsUseCase;
    getPurchaseRequest: GetPurchaseRequestUseCase;
    getEvidencePdf: GetEvidencePdfUseCase;
    getApproval: GetApprovalUseCase;
    verifyApprovalOtp: VerifyApprovalOtpUseCase;
    signApproval: SignApprovalUseCase;
    rejectApproval: RejectApprovalUseCase;
    listMockMail: ListMockMailUseCase;
}

/**
 * Creates and returns an object containing all the dependencies required for the application use cases.
 * @returns An object containing instances of the use cases with their respective dependencies injected.
 */
export function createDependencies(): Dependencies {
    const purchaseRequestsTable = envs.PURCHASE_REQUESTS_TABLE;
    const mockMailTable = envs.MOCK_MAIL_TABLE;
    const evidenceBucket = envs.EVIDENCE_BUCKET;
    const frontendBaseUrl = envs.FRONTEND_BASE_URL;

    const repository = new DynamoPurchaseRequestRepository(
        purchaseRequestsTable,
    );
    const mockMailStore = new DynamoMockMailStore(mockMailTable);
    const notificationService = new MockNotificationService(
        mockMailStore,
        frontendBaseUrl,
    );
    const pdfGenerator = new PdfKitEvidenceGenerator();
    const evidenceStorage = new S3EvidenceStorage(evidenceBucket);

    const generatePurchaseEvidence = new GeneratePurchaseEvidenceUseCase(
        repository,
        pdfGenerator,
        evidenceStorage,
    );

    return {
        createPurchaseRequest: new CreatePurchaseRequestUseCase(
            repository,
            notificationService,
        ),
        listPurchaseRequests: new ListPurchaseRequestsUseCase(repository),
        getPurchaseRequest: new GetPurchaseRequestUseCase(repository),
        getEvidencePdf: new GetEvidencePdfUseCase(repository, evidenceStorage),
        getApproval: new GetApprovalUseCase(repository),
        verifyApprovalOtp: new VerifyApprovalOtpUseCase(repository),
        signApproval: new SignApprovalUseCase(
            repository,
            generatePurchaseEvidence,
        ),
        rejectApproval: new RejectApprovalUseCase(repository),
        listMockMail: new ListMockMailUseCase(mockMailStore),
    };
}
