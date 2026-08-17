import { createDependencies } from '../infraestructure/container';
import { toApprovalViewDto } from './dto/approvalView.dto';
import {
    jsonResponse,
    parseBody,
    parsePathParams,
    withHttpErrorHandling,
} from './http';
import { otpCodeSchema } from './schemas/otpCodeSchema';
import { approvalParamsSchema } from './schemas/pathParamsSchemas';

const { verifyApprovalOtp } = createDependencies();

export const handler = withHttpErrorHandling(async (event) => {
    const { id, token } = parsePathParams(event, approvalParamsSchema);
    const { code } = parseBody(event, otpCodeSchema);

    const { request, approval } = await verifyApprovalOtp.execute({
        requestId: id,
        token,
        code,
    });

    return jsonResponse(200, toApprovalViewDto(request, approval));
});
