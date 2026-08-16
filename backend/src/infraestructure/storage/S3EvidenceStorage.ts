import {
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { EvidenceStorage } from '../../application/ports/EvidenceStorage';

export class S3EvidenceStorage implements EvidenceStorage {
    private readonly client = new S3Client({});

    constructor(private readonly bucketName: string) {}

    async save(key: string, content: Buffer): Promise<void> {
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: content,
                ContentType: 'application/pdf',
            }),
        );
    }

    async get(key: string): Promise<Buffer> {
        const result = await this.client.send(
            new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
        );

        const bytes = await result.Body?.transformToByteArray();

        if (!bytes) {
            throw new Error(`Evidence object not found for key: ${key}`);
        }

        return Buffer.from(bytes);
    }
}
