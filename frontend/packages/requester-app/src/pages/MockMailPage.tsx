import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, getErrorMessage, listMockMail } from '@app/shared';
import type { MockMailEntry } from '@app/shared';
import { extractApprovalLink, extractOtpCode } from '../utils/parse-mock-mail';

export function MockMailPage() {
    const [entries, setEntries] = useState<MockMailEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let ignore = false;

        async function loadEntries() {
            try {
                const result = await listMockMail();
                if (!ignore) {
                    setEntries(result);
                    setError(null);
                }
            } catch (err: unknown) {
                if (!ignore) {
                    setError(getErrorMessage(err));
                }
            }
        }

        void loadEntries();

        return () => {
            ignore = true;
        };
    }, [refreshKey]);

    return (
        <div className="card">
            <div className="page-header">
                <h2>Correos simulados</h2>
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

            {entries === null && !error && (
                <p className="text-muted">Cargando...</p>
            )}

            {entries && entries.length === 0 && (
                <p className="text-muted">Todavía no se enviaron correos.</p>
            )}

            {entries && entries.length > 0 && (
                <table className="table">
                    <thead>
                        <tr>
                            <th>Destinatario</th>
                            <th>Código</th>
                            <th>Fecha</th>
                            <th>Mensaje</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {[...entries].reverse().map((entry) => {
                            const link = extractApprovalLink(entry.body);
                            const code = extractOtpCode(entry.body);
                            return (
                                <tr key={entry.approvalId}>
                                    <td>{entry.email}</td>
                                    <td>{code ?? '—'}</td>
                                    <td>{formatDate(entry.sentAt)}</td>
                                    <td className="text-muted">{entry.body}</td>
                                    <td>
                                        {link && (
                                            <Link
                                                className="link-detail"
                                                to={`/approve?solicitud_id=${link.requestId}&approver_token=${link.token}`}
                                            >
                                                Abrir link
                                            </Link>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default MockMailPage;
