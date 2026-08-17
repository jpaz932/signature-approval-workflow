/** Generic HTTP port used by the API client; decouples it from the concrete HTTP library. */
export interface HttpClient {
    get<T>(path: string): Promise<T>;
    post<T>(path: string, body?: unknown): Promise<T>;
}
