import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';

const RequestListPage = lazy(() => import('requesterApp/RequestListPage'));
const CreateRequestPage = lazy(() => import('requesterApp/CreateRequestPage'));
const RequestDetailPage = lazy(() => import('requesterApp/RequestDetailPage'));
const MockMailPage = lazy(() => import('requesterApp/MockMailPage'));
const ApprovalPage = lazy(() => import('approverApp/ApprovalPage'));

export function App() {
    return (
        <BrowserRouter>
            <Layout>
                <Suspense fallback={<p>Cargando...</p>}>
                    <Routes>
                        <Route
                            path="/"
                            element={<Navigate to="/solicitudes" replace />}
                        />
                        <Route
                            path="/solicitudes"
                            element={<RequestListPage />}
                        />
                        <Route
                            path="/solicitudes/nueva"
                            element={<CreateRequestPage />}
                        />
                        <Route
                            path="/solicitudes/:id"
                            element={<RequestDetailPage />}
                        />
                        <Route path="/correos" element={<MockMailPage />} />
                        <Route path="/approve" element={<ApprovalPage />} />
                    </Routes>
                </Suspense>
            </Layout>
        </BrowserRouter>
    );
}
