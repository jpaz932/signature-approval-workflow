import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    getErrorMessage,
    getEvidencePdfUrl,
    getPurchaseRequest,
} from '@app/shared';
import type { ApprovalDetail, PurchaseRequest } from '@app/shared';
import {
    APPROVAL_STATUS_BADGE_CLASS,
    APPROVAL_STATUS_LABEL,
    REQUEST_STATUS_BADGE_CLASS,
    REQUEST_STATUS_LABEL,
} from '../constants/status';
import { formatAmount, formatDate } from '../utils/format';

function approvalTimestamp(approval: ApprovalDetail): string | null {
    return approval.signedAt ?? approval.rejectedAt;
}

export function RequestDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [request, setRequest] = useState<PurchaseRequest | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!id) {
            return;
        }

        const requestId = id;
        let ignore = false;

        async function loadRequest() {
            try {
                const result = await getPurchaseRequest(requestId);

                if (!ignore) {
                    setRequest(result);
                    setError(null);
                }
            } catch (err: unknown) {
                if (!ignore) {
                    setError(getErrorMessage(err));
                }
            }
        }

        void loadRequest();

        return () => {
            ignore = true;
        };
    }, [id, refreshKey]);

    if (error) {
        return (
            <p role="alert" className="form-error">
                {error}
            </p>
        );
    }

    if (!request) {
        return <p className="text-muted">Cargando...</p>;
    }

    return (
        <div className="card">
            <div className="page-header">
                <h2>{request.title}</h2>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setRefreshKey((key) => key + 1)}
                >
                    Actualizar
                </button>
            </div>

            <p>{request.description}</p>

            <dl className="detail-grid">
                <dt>Monto</dt>
                <dd>{formatAmount(request.amount)}</dd>
                <dt>Solicitante</dt>
                <dd>
                    {request.requester.name} ({request.requester.email})
                </dd>
                <dt>Fecha de creación</dt>
                <dd>{formatDate(request.createdAt)}</dd>
                <dt>Estado</dt>
                <dd>
                    <span
                        className={`badge ${REQUEST_STATUS_BADGE_CLASS[request.status]}`}
                    >
                        {REQUEST_STATUS_LABEL[request.status]}
                    </span>
                </dd>
            </dl>

            <h3>Aprobadores</h3>
            <table className="table">
                <thead>
                    <tr>
                        <th>Rol</th>
                        <th>Nombre</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                    </tr>
                </thead>
                <tbody>
                    {request.approvals.map((approval) => {
                        const timestamp = approvalTimestamp(approval);
                        return (
                            <tr key={approval.id}>
                                <td>{approval.role}</td>
                                <td>{approval.name}</td>
                                <td>
                                    <span
                                        className={`badge ${APPROVAL_STATUS_BADGE_CLASS[approval.status]}`}
                                    >
                                        {APPROVAL_STATUS_LABEL[approval.status]}
                                    </span>
                                </td>
                                <td>
                                    {timestamp ? formatDate(timestamp) : '—'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {request.evidenceAvailable && (
                <div className="button-row">
                    <a
                        href={getEvidencePdfUrl(request.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary"
                    >
                        Descargar PDF
                    </a>
                </div>
            )}
        </div>
    );
}

export default RequestDetailPage;
