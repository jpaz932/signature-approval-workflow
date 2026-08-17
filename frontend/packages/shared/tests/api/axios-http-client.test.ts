const mockAxiosInstance = { get: jest.fn(), post: jest.fn() };

jest.mock('axios', () => ({
    __esModule: true,
    default: { create: jest.fn(() => mockAxiosInstance) },
}));

import axios from 'axios';
import { AxiosHttpClient } from '../../src/api/axios-http-client';

describe('AxiosHttpClient', () => {
    beforeEach(() => {
        mockAxiosInstance.get.mockReset();
        mockAxiosInstance.post.mockReset();
        (axios.create as jest.Mock).mockClear();
    });

    it('creates the underlying axios instance with the given base URL', () => {
        new AxiosHttpClient('https://api.example.com');

        // eslint-disable-next-line @typescript-eslint/unbound-method -- axios.create is a jest.fn() mock, not a real bound method
        expect(axios.create).toHaveBeenCalledWith({
            baseURL: 'https://api.example.com',
        });
    });

    it('get() delegates to axios.get and unwraps the response data', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({ data: { ok: true } });
        const client = new AxiosHttpClient('https://api.example.com');

        const result = await client.get('/path');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/path');
        expect(result).toEqual({ ok: true });
    });

    it('post() delegates to axios.post with the body and unwraps the response data', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({ data: { ok: true } });
        const client = new AxiosHttpClient('https://api.example.com');

        const result = await client.post('/path', { a: 1 });

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/path', { a: 1 });
        expect(result).toEqual({ ok: true });
    });

    it('post() works without a body', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({ data: null });
        const client = new AxiosHttpClient('https://api.example.com');

        await client.post('/path');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/path', undefined);
    });
});
