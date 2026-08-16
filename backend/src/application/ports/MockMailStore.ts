import { MockMailEntry } from '../types/mockMailStore';

export interface MockMailStore {
    save(entry: MockMailEntry): Promise<void>;
    list(): Promise<MockMailEntry[]>;
}
