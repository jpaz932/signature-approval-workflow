import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { PurchaseRequest } from '../../domain/entities/PurchaseRequest';
import { PurchaseRequestRepository } from '../../application/ports/PurchaseRequestRepository';
import {
    fromPurchaseRequestItem,
    toPurchaseRequestItem,
} from '../mappers/purchaseRequestMapper';
import { PurchaseRequestRecord } from '../types/dynamoPurchaseRequest';

const sortkey = 'REQUEST';
const partitionKey = (id: string) => `$${sortkey}#${id}`;

export class DynamoPurchaseRequestRepository implements PurchaseRequestRepository {
    private readonly docClient: DynamoDBDocumentClient;

    constructor(private readonly tableName: string) {
        this.docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    }

    /**
     * Saves a purchase request to the DynamoDB table
     * @param request The purchase request to be saved, containing ID, title, description, amount, requester information, creation timestamp, status, evidence key, and approvals.
     * @returns A promise that resolves when the purchase request has been saved to the DynamoDB table.
     */
    async save(request: PurchaseRequest): Promise<void> {
        const record = toPurchaseRequestItem(request);

        await this.docClient.send(
            new PutCommand({
                TableName: this.tableName,
                Item: {
                    PK: partitionKey(request.id),
                    SK: sortkey,
                    ...record,
                },
            }),
        );
    }

    /**
     * Finds a purchase request by its ID in the DynamoDB table
     * @param id The ID of the purchase request to be retrieved.
     * @returns A promise that resolves to the found PurchaseRequest or null if not found.
     */
    async findById(id: string): Promise<PurchaseRequest | null> {
        const result = await this.docClient.send(
            new GetCommand({
                TableName: this.tableName,
                Key: { PK: partitionKey(id), SK: sortkey },
            }),
        );

        return result.Item
            ? fromPurchaseRequestItem(result.Item as PurchaseRequestRecord)
            : null;
    }

    /**
     * Finds all purchase requests in the DynamoDB table
     * @returns A promise that resolves to an array of all PurchaseRequests found in the DynamoDB table.
     */
    async findAll(): Promise<PurchaseRequest[]> {
        const result = await this.docClient.send(
            new ScanCommand({ TableName: this.tableName }),
        );

        return (result.Items ?? []).map((item) =>
            fromPurchaseRequestItem(item as PurchaseRequestRecord),
        );
    }
}
