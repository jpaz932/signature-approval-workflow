import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface LayoutProps {
    children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <div>
            <header className="app-header">
                <div className="app-header__inner">
                    <h1>Aprobaciones de Compra</h1>
                    <nav className="nav">
                        <NavLink
                            to="/solicitudes"
                            className={({ isActive }) =>
                                isActive ? 'active' : undefined
                            }
                        >
                            Solicitudes
                        </NavLink>
                        <NavLink
                            to="/solicitudes/nueva"
                            className={({ isActive }) =>
                                isActive ? 'active' : undefined
                            }
                        >
                            Nueva solicitud
                        </NavLink>
                    </nav>
                </div>
            </header>
            <main className="container">{children}</main>
        </div>
    );
}
