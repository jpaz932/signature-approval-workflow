import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';

const CreateRequestPage = lazy(() => import('requesterApp/CreateRequestPage'));

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
                            path="/solicitudes/nueva"
                            element={<CreateRequestPage />}
                        />
                    </Routes>
                </Suspense>
            </Layout>
        </BrowserRouter>
    );
}
