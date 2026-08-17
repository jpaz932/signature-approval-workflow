import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@app/shared/src/styles/base.css';
import { CreateRequestPage } from './pages/CreateRequestPage';

/** Throws when the DOM has no `#root` container to mount into. */
export function getRootElement(): HTMLElement {
    const container = document.getElementById('root');
    if (!container) {
        throw new Error('Root element not found');
    }
    return container;
}

/** Standalone dev preview only — when federated, the shell mounts the exposed pages directly. */
export function mount(): void {
    createRoot(getRootElement()).render(
        <StrictMode>
            <BrowserRouter>
                <div className="container">
                    <CreateRequestPage />
                </div>
            </BrowserRouter>
        </StrictMode>,
    );
}
