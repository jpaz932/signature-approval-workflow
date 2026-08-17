import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { createPurchaseRequest, getErrorMessage } from '@app/shared';
import type { ApproverInput, PurchaseRequest } from '@app/shared';
import { MOCK_APPROVERS } from '../data/mock-approvers';
import {
    FormInput,
    FormOutput,
    formSchema,
} from './schemas/createPurchaseRequest';
import { REQUIRED_APPROVERS } from './constants';

export function CreateRequestPage() {
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [created, setCreated] = useState<PurchaseRequest | null>(null);

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm<FormInput, unknown, FormOutput>({
        resolver: zodResolver(formSchema),
        defaultValues: { approverIds: [] },
    });

    function handleCreateAnother() {
        setCreated(null);
        reset({ approverIds: [] });
    }

    async function onSubmit(values: FormOutput) {
        const approvers = values.approverIds.map((id): ApproverInput => {
            const approver = MOCK_APPROVERS.find(
                (candidate) => candidate.id === id,
            );
            if (!approver) {
                throw new Error(`Aprobador desconocido: ${id}`);
            }
            return {
                name: approver.name,
                email: approver.email,
                role: approver.role,
            };
        }) as [ApproverInput, ApproverInput, ApproverInput];

        setSubmitting(true);
        setSubmitError(null);
        try {
            setCreated(
                await createPurchaseRequest({
                    title: values.title,
                    description: values.description,
                    amount: values.amount,
                    requester: {
                        name: values.requesterName,
                        email: values.requesterEmail,
                    },
                    approvers,
                }),
            );
        } catch (err) {
            setSubmitError(getErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    }

    if (created) {
        return (
            <div className="card">
                <h2>Solicitud creada</h2>
                <p>
                    <strong>{created.title}</strong> quedó registrada con estado{' '}
                    <span className="badge badge-pending">Pendiente</span>.
                </p>
                <p className="text-muted">ID: {created.id}</p>
                <ul>
                    {created.approvals.map((approval) => (
                        <li key={approval.id}>
                            {approval.role} — {approval.name} ({approval.email})
                        </li>
                    ))}
                </ul>
                <div className="button-row">
                    <Link to="/solicitudes" className="btn btn-secondary">
                        Volver al listado
                    </Link>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleCreateAnother}
                    >
                        Crear otra solicitud
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form
            className="card"
            onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        >
            <h2>Nueva solicitud de compra</h2>

            <div className="field">
                <label htmlFor="title">Título</label>
                <input id="title" className="input" {...register('title')} />
                {errors.title && (
                    <p role="alert" className="form-error">
                        {errors.title.message}
                    </p>
                )}
            </div>

            <div className="field">
                <label htmlFor="description">Descripción</label>
                <textarea
                    id="description"
                    className="textarea"
                    {...register('description')}
                />
                {errors.description && (
                    <p role="alert" className="form-error">
                        {errors.description.message}
                    </p>
                )}
            </div>

            <div className="field">
                <label htmlFor="amount">Monto</label>
                <input
                    id="amount"
                    className="input"
                    type="number"
                    step="0.01"
                    {...register('amount')}
                />
                {errors.amount && (
                    <p role="alert" className="form-error">
                        {errors.amount.message}
                    </p>
                )}
            </div>

            <div className="field">
                <label htmlFor="requesterName">Tu nombre</label>
                <input
                    id="requesterName"
                    className="input"
                    {...register('requesterName')}
                />
                {errors.requesterName && (
                    <p role="alert" className="form-error">
                        {errors.requesterName.message}
                    </p>
                )}
            </div>

            <div className="field">
                <label htmlFor="requesterEmail">Tu correo</label>
                <input
                    id="requesterEmail"
                    className="input"
                    type="email"
                    {...register('requesterEmail')}
                />
                {errors.requesterEmail && (
                    <p role="alert" className="form-error">
                        {errors.requesterEmail.message}
                    </p>
                )}
            </div>

            <Controller
                control={control}
                name="approverIds"
                render={({ field }) => (
                    <div className="field">
                        <span id="approvers-label">
                            Aprobadores ({field.value.length}/
                            {REQUIRED_APPROVERS})
                        </span>
                        <div
                            className="approver-list"
                            role="group"
                            aria-labelledby="approvers-label"
                        >
                            {MOCK_APPROVERS.map((approver) => {
                                const checked = field.value.includes(
                                    approver.id,
                                );
                                const disabled =
                                    !checked &&
                                    field.value.length >= REQUIRED_APPROVERS;
                                return (
                                    <label
                                        className="approver-option"
                                        key={approver.id}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={disabled}
                                            onChange={(event) => {
                                                field.onChange(
                                                    event.target.checked
                                                        ? [
                                                              ...field.value,
                                                              approver.id,
                                                          ]
                                                        : field.value.filter(
                                                              (id) =>
                                                                  id !==
                                                                  approver.id,
                                                          ),
                                                );
                                            }}
                                        />
                                        <span>
                                            {approver.name} — {approver.role} (
                                            {approver.email})
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        {errors.approverIds && (
                            <p role="alert" className="form-error">
                                {errors.approverIds.message}
                            </p>
                        )}
                    </div>
                )}
            />

            {submitError && (
                <p role="alert" className="form-error">
                    {submitError}
                </p>
            )}

            <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
            >
                {submitting ? 'Creando...' : 'Crear solicitud'}
            </button>
        </form>
    );
}

export default CreateRequestPage;
