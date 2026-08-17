import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';

export function App() {
    return (
        <BrowserRouter>
            <Layout>
                <Routes>
                    <Route
                        path="/"
                        element={<Navigate to="/solicitudes" replace />}
                    />
                </Routes>
            </Layout>
        </BrowserRouter>
    );
}
