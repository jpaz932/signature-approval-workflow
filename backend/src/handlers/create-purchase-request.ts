import { createDependencies } from '../infraestructure/container';
import { toPurchaseRequestDto } from './dto/purchaseRequest.dto';
import { jsonResponse, parseBody, withHttpErrorHandling } from './http';
import { createPurchaseRequestSchema } from './schemas/createPurchaseRequestSchema';

const { createPurchaseRequest } = createDependencies();

export const handler = withHttpErrorHandling(async (event) => {
    const input = parseBody(event, createPurchaseRequestSchema);

    const request = await createPurchaseRequest.execute(input);

    return jsonResponse(201, toPurchaseRequestDto(request));
});
