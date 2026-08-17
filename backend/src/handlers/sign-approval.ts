import { createDependencies } from '../infraestructure/container';
import { toPurchaseRequestDto } from './dto/purchaseRequest.dto';
import {
    jsonResponse,
    parseBody,
    parsePathParams,
    withHttpErrorHandling,
} from './http';
import { otpCodeSchema } from './schemas/otpCodeSchema';
import { approvalParamsSchema } from './schemas/pathParamsSchemas';

const { signApproval } = createDependencies();

export const handler = withHttpErrorHandling(async (event) => {
    const { id, token } = parsePathParams(event, approvalParamsSchema);
    const { code } = parseBody(event, otpCodeSchema);

    const { request } = await signApproval.execute({
        requestId: id,
        token,
        code,
    });

    return jsonResponse(200, toPurchaseRequestDto(request));
});
