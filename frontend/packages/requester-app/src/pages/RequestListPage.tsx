import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage, listPurchaseRequests } from '@app/shared';
import type { PurchaseRequest } from '@app/shared';
import {
    REQUEST_STATUS_BADGE_CLASS,
    REQUEST_STATUS_LABEL,
} from '../constants/status';
import { formatAmount, formatDate } from '../utils/format';

export function RequestListPage() {
    const [requests, setRequests] = useState<PurchaseRequest[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let ignore = false;

        async function loadRequests() {
            setError(null);

            try {
                const result = await listPurchaseRequests();

                if (!ignore) {
                    setRequests(result);
                    setError(null);
                }
            } catch (err: unknown) {
                if (!ignore) {
                    setError(getErrorMessage(err));
                }
            }
        }

        void loadRequests();

        return () => {
            ignore = true;
        };
    }, [refreshKey]);

    return (
        <div className="card">
            <div className="page-header">
                <h2>Solicitudes de compra</h2>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setRefreshKey((key) => key + 1)}
                >
                    Actualizar
                </button>
            </div>

            {error && (
                <p role="alert" className="form-error">
                    {error}
                </p>
            )}

            {requests === null && !error && (
                <p className="text-muted">Cargando...</p>
            )}

            {requests && requests.length === 0 && (
                <p className="text-muted">Todavía no hay solicitudes.</p>
            )}

            {requests && requests.length > 0 && (
                <table className="table">
                    <thead>
                        <tr>
                            <th>Título</th>
                            <th>Solicitante</th>
                            <th>Monto</th>
                            <th>Estado</th>
                            <th>Fecha</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((request) => (
                            <tr key={request.id}>
                                <td>{request.title}</td>
                                <td>{request.requester.name}</td>
                                <td>{formatAmount(request.amount)}</td>
                                <td>
                                    <span
                                        className={`badge ${REQUEST_STATUS_BADGE_CLASS[request.status]}`}
                                    >
                                        {REQUEST_STATUS_LABEL[request.status]}
                                    </span>
                                </td>
                                <td>{formatDate(request.createdAt)}</td>
                                <td>
                                    <Link
                                        className="link-detail"
                                        to={`/solicitudes/${request.id}`}
                                    >
                                        Ver detalle
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default RequestListPage;
