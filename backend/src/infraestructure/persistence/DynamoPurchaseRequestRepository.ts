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

    async findAll(): Promise<PurchaseRequest[]> {
        const result = await this.docClient.send(
            new ScanCommand({ TableName: this.tableName }),
        );

        return (result.Items ?? []).map((item) =>
            fromPurchaseRequestItem(item as PurchaseRequestRecord),
        );
    }
}
