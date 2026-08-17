import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@app/shared/src/styles/base.css';
import { App } from './App';

/** Throws when the DOM has no `#root` container to mount into. */
export function getRootElement(): HTMLElement {
    const container = document.getElementById('root');
    if (!container) {
        throw new Error('Root element not found');
    }
    return container;
}

export function mount(): void {
    createRoot(getRootElement()).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
}
