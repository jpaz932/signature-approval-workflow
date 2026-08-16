import { randomUUID } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    PutCommand,
    ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { MockMailStore } from '../../application/ports/MockMailStore';
import { MockMailEntry } from '../../application/types/mockMailStore';
import { MockMailRecord } from '../types/dynamoMockMail';

export class DynamoMockMailStore implements MockMailStore {
    private readonly docClient: DynamoDBDocumentClient;

    constructor(private readonly tableName: string) {
        this.docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    }

    /**
     * Saves a simulated email entry to the DynamoDB table
     * @param entry The simulated email entry to be saved, containing request ID, approval ID, email, subject, body, and sent timestamp.
     * @returns A promise that resolves when the entry has been saved to the DynamoDB table.
     */
    async save(entry: MockMailEntry): Promise<void> {
        const id = `MAIL#${randomUUID()}`;

        await this.docClient.send(
            new PutCommand({
                TableName: this.tableName,
                Item: {
                    PK: id,
                    SK: id,
                    requestId: entry.requestId,
                    approvalId: entry.approvalId,
                    email: entry.email,
                    subject: entry.subject,
                    body: entry.body,
                    sentAt: entry.sentAt.toISOString(),
                },
            }),
        );
    }

    /**
     * Lists all simulated email entries stored in the DynamoDB table, sorted by sent timestamp.
     * @returns A promise that resolves to an array of simulated email entries, each containing request ID, approval ID, email, subject, body, and sent timestamp.
     */
    async list(): Promise<MockMailEntry[]> {
        const result = await this.docClient.send(
            new ScanCommand({ TableName: this.tableName }),
        );

        return (result.Items ?? [])
            .map((item) => item as MockMailRecord)
            .map((record) => ({
                requestId: record.requestId,
                approvalId: record.approvalId,
                email: record.email,
                subject: record.subject,
                body: record.body,
                sentAt: new Date(record.sentAt),
            }))
            .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
    }
}
