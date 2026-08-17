import axios, { type AxiosInstance } from 'axios';
import type { HttpClient } from './http-client';

/** Axios-backed implementation of the {@link HttpClient} port. */
export class AxiosHttpClient implements HttpClient {
    private readonly instance: AxiosInstance;

    constructor(baseURL: string) {
        this.instance = axios.create({ baseURL });
    }

    async get<T>(path: string): Promise<T> {
        const { data } = await this.instance.get<T>(path);
        return data;
    }

    async post<T>(path: string, body?: unknown): Promise<T> {
        const { data } = await this.instance.post<T>(path, body);
        return data;
    }
}
