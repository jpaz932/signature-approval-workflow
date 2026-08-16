/* eslint-disable @typescript-eslint/require-await */
import { MockMailStore } from '../../../src/application/ports/MockMailStore';
import { MockMailEntry } from '../../../src/application/types/mockMailStore';
import { ListMockMailUseCase } from '../../../src/application/use-cases/ListMockMail';

class FakeMockMailStore implements MockMailStore {
    private entries: MockMailEntry[] = [];

    async save(entry: MockMailEntry): Promise<void> {
        this.entries.push(entry);
    }

    async list(): Promise<MockMailEntry[]> {
        return this.entries;
    }
}

describe('ListMockMailUseCase', () => {
    it('should return an empty list when nothing has been sent', async () => {
        const store = new FakeMockMailStore();
        const useCase = new ListMockMailUseCase(store);

        const result = await useCase.execute();

        expect(result).toEqual([]);
    });

    it('should return every recorded mock mail entry', async () => {
        const store = new FakeMockMailStore();
        const entry: MockMailEntry = {
            requestId: 'request-1',
            approvalId: 'approval-1',
            email: 'approver@example.com',
            subject: 'Solicitud de aprobación',
            body: 'Link: https://dominio.com/approve?solicitud_id=request-1&approver_token=abc',
            sentAt: new Date(),
        };
        await store.save(entry);
        const useCase = new ListMockMailUseCase(store);

        const result = await useCase.execute();

        expect(result).toEqual([entry]);
    });
});
