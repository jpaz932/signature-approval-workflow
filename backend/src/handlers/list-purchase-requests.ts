import { createDependencies } from '../infraestructure/container';
import { toPurchaseRequestDto } from './dto/purchaseRequest.dto';
import { jsonResponse, withHttpErrorHandling } from './http';

const { listPurchaseRequests } = createDependencies();

export const handler = withHttpErrorHandling(async () => {
    const requests = await listPurchaseRequests.execute();

    return jsonResponse(200, requests.map(toPurchaseRequestDto));
});
