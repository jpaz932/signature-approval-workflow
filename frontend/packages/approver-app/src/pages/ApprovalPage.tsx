import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    APPROVAL_STATUS_BADGE_CLASS,
    APPROVAL_STATUS_LABEL,
    formatAmount,
    formatDate,
    getApprovalSummary,
    getErrorMessage,
    getEvidencePdfUrl,
    REQUEST_STATUS_BADGE_CLASS,
    REQUEST_STATUS_LABEL,
    rejectApproval,
    signApproval,
    verifyApprovalOtp,
} from '@app/shared';
import type {
    ApprovalDetail,
    ApprovalSummary,
    ApprovalView,
} from '@app/shared';

function approvalTimestamp(approval: ApprovalDetail): string | null {
    return approval.signedAt ?? approval.rejectedAt;
}

export function ApprovalPage() {
    const [searchParams] = useSearchParams();
    const requestId = searchParams.get('solicitud_id');
    const token = searchParams.get('approver_token');

    const [summary, setSummary] = useState<ApprovalSummary | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [otpError, setOtpError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [detail, setDetail] = useState<ApprovalView | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [acting, setActing] = useState(false);

    useEffect(() => {
        if (!requestId || !token) {
            return;
        }
        const currentRequestId = requestId;
        const currentToken = token;
        let ignore = false;

        async function loadSummary() {
            try {
                const result = await getApprovalSummary(
                    currentRequestId,
                    currentToken,
                );
                if (!ignore) {
                    setSummary(result);
                }
            } catch (err: unknown) {
                if (!ignore) {
                    setLoadError(getErrorMessage(err));
                }
            }
        }

        void loadSummary();

        return () => {
            ignore = true;
        };
    }, [requestId, token]);

    async function handleVerify(event: FormEvent) {
        event.preventDefault();
        if (!requestId || !token) {
            return;
        }
        setOtpError(null);
        setVerifying(true);
        try {
            setDetail(await verifyApprovalOtp(requestId, token, code));
        } catch (err) {
            setOtpError(getErrorMessage(err));
        } finally {
            setVerifying(false);
        }
    }

    async function handleSign() {
        if (!requestId || !token) {
            return;
        }
        setActionError(null);
        setActing(true);
        try {
            const updated = await signApproval(requestId, token, code);
            setDetail((prev) =>
                prev ? { ...updated, approvalId: prev.approvalId } : prev,
            );
        } catch (err) {
            setActionError(getErrorMessage(err));
        } finally {
            setActing(false);
        }
    }

    async function handleReject() {
        if (!requestId || !token) {
            return;
        }
        setActionError(null);
        setActing(true);
        try {
            const updated = await rejectApproval(requestId, token, code);
            setDetail((prev) =>
                prev ? { ...updated, approvalId: prev.approvalId } : prev,
            );
        } catch (err) {
            setActionError(getErrorMessage(err));
        } finally {
            setActing(false);
        }
    }

    if (!requestId || !token) {
        return (
            <div className="card">
                <p role="alert" className="form-error">
                    Este link de aprobación no es válido.
                </p>
            </div>
        );
    }

    if (detail) {
        const myApproval = detail.approvals.find(
            (approval) => approval.id === detail.approvalId,
        );
        const canAct =
            detail.status === 'PENDING' && myApproval?.status === 'PENDING';

        return (
            <div className="card">
                <h2>{detail.title}</h2>
                <p>{detail.description}</p>

                <dl className="detail-grid">
                    <dt>Monto</dt>
                    <dd>{formatAmount(detail.amount)}</dd>
                    <dt>Solicitante</dt>
                    <dd>
                        {detail.requester.name} ({detail.requester.email})
                    </dd>
                    <dt>Fecha de creación</dt>
                    <dd>{formatDate(detail.createdAt)}</dd>
                    <dt>Estado de la solicitud</dt>
                    <dd>
                        <span
                            className={`badge ${REQUEST_STATUS_BADGE_CLASS[detail.status]}`}
                        >
                            {REQUEST_STATUS_LABEL[detail.status]}
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
                        {detail.approvals.map((approval) => {
                            const timestamp = approvalTimestamp(approval);
                            return (
                                <tr key={approval.id}>
                                    <td>{approval.role}</td>
                                    <td>{approval.name}</td>
                                    <td>
                                        <span
                                            className={`badge ${APPROVAL_STATUS_BADGE_CLASS[approval.status]}`}
                                        >
                                            {
                                                APPROVAL_STATUS_LABEL[
                                                    approval.status
                                                ]
                                            }
                                        </span>
                                    </td>
                                    <td>
                                        {timestamp
                                            ? formatDate(timestamp)
                                            : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {actionError && (
                    <p role="alert" className="form-error">
                        {actionError}
                    </p>
                )}

                {canAct && (
                    <div className="button-row">
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={acting}
                            onClick={() => void handleSign()}
                        >
                            {acting ? 'Procesando...' : 'Aprobar'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger"
                            disabled={acting}
                            onClick={() => void handleReject()}
                        >
                            {acting ? 'Procesando...' : 'Rechazar'}
                        </button>
                    </div>
                )}

                {!canAct && myApproval?.status === 'SIGNED' && (
                    <p className="text-muted">Ya aprobaste esta solicitud.</p>
                )}
                {!canAct && myApproval?.status === 'REJECTED' && (
                    <p className="text-muted">Ya rechazaste esta solicitud.</p>
                )}
                {!canAct &&
                    myApproval?.status === 'PENDING' &&
                    detail.status !== 'PENDING' && (
                        <p className="text-muted">
                            Esta solicitud ya fue cerrada por otro aprobador.
                        </p>
                    )}

                {detail.evidenceAvailable && (
                    <div className="button-row">
                        <a
                            href={getEvidencePdfUrl(detail.id)}
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

    if (loadError) {
        return (
            <div className="card">
                <p role="alert" className="form-error">
                    {loadError}
                </p>
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="card">
                <p className="text-muted">Cargando...</p>
            </div>
        );
    }

    if (summary.status !== 'PENDING') {
        return (
            <div className="card">
                <h2>{summary.requestTitle}</h2>
                <p>Esta aprobación ya no está pendiente.</p>
                <span
                    className={`badge ${APPROVAL_STATUS_BADGE_CLASS[summary.status]}`}
                >
                    {APPROVAL_STATUS_LABEL[summary.status]}
                </span>
            </div>
        );
    }

    return (
        <form className="card" onSubmit={(event) => void handleVerify(event)}>
            <h2>{summary.requestTitle}</h2>
            <p className="text-muted">
                Hola {summary.approverName} ({summary.approverRole})
            </p>

            <div className="field">
                <label htmlFor="code">Código de verificación</label>
                <input
                    id="code"
                    className="input"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    required
                />
            </div>

            {otpError && (
                <p role="alert" className="form-error">
                    {otpError}
                </p>
            )}

            <button
                type="submit"
                className="btn btn-primary"
                disabled={verifying}
            >
                {verifying ? 'Verificando...' : 'Verificar código'}
            </button>
        </form>
    );
}

export default ApprovalPage;
