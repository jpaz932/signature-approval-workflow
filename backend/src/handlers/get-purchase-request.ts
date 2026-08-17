import { createDependencies } from '../infraestructure/container';
import { toPurchaseRequestDto } from './dto/purchaseRequest.dto';
import { jsonResponse, parsePathParams, withHttpErrorHandling } from './http';
import { purchaseRequestIdParamsSchema } from './schemas/pathParamsSchemas';

const { getPurchaseRequest } = createDependencies();

export const handler = withHttpErrorHandling(async (event) => {
    const { id } = parsePathParams(event, purchaseRequestIdParamsSchema);

    const request = await getPurchaseRequest.execute({ requestId: id });

    return jsonResponse(200, toPurchaseRequestDto(request));
});
