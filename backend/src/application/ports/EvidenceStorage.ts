export interface EvidenceStorage {
    save(key: string, content: Buffer): Promise<void>;
    get(key: string): Promise<Buffer>;
}
