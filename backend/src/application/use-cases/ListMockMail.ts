import { MockMailStore } from '../ports/MockMailStore';
import { MockMailEntry } from '../types/mockMailStore';

export class ListMockMailUseCase {
    constructor(private readonly mockMailStore: MockMailStore) {}

    /**
     * Lists every simulated email sent so far
     */
    async execute(): Promise<MockMailEntry[]> {
        return this.mockMailStore.list();
    }
}
