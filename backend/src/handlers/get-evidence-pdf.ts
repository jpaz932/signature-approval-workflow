import { createDependencies } from '../infraestructure/container';
import { parsePathParams, withHttpErrorHandling } from './http';
import { purchaseRequestIdParamsSchema } from './schemas/pathParamsSchemas';

const { getEvidencePdf } = createDependencies();

export const handler = withHttpErrorHandling(async (event) => {
    const { id } = parsePathParams(event, purchaseRequestIdParamsSchema);

    const pdf = await getEvidencePdf.execute({ requestId: id });

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="evidencia-${id}.pdf"`,
        },
        body: pdf.toString('base64'),
        isBase64Encoded: true,
    };
});
