import { createDependencies } from '../infraestructure/container';
import { toApprovalViewDto } from './dto/approvalView.dto';
import { jsonResponse, parsePathParams, withHttpErrorHandling } from './http';
import { approvalParamsSchema } from './schemas/pathParamsSchemas';

const { getApproval } = createDependencies();

export const handler = withHttpErrorHandling(async (event) => {
    const { id, token } = parsePathParams(event, approvalParamsSchema);

    const { request, approval } = await getApproval.execute({
        requestId: id,
        token,
    });

    return jsonResponse(200, toApprovalViewDto(request, approval));
});
