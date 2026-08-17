import { createDependencies } from '../infraestructure/container';
import { jsonResponse, withHttpErrorHandling } from './http';

const { listMockMail } = createDependencies();

export const handler = withHttpErrorHandling(async () => {
    const entries = await listMockMail.execute();

    return jsonResponse(200, entries);
});
