export interface MockApprover {
    id: string;
    name: string;
    email: string;
    role: string;
}

/** Simulated approver data for development and testing purposes only. */
export const MOCK_APPROVERS: MockApprover[] = [
    {
        id: '1',
        name: 'Ana Gómez',
        email: 'ana.gomez@example.com',
        role: 'MANAGER',
    },
    {
        id: '2',
        name: 'Luis Rojas',
        email: 'luis.rojas@example.com',
        role: 'FINANCE',
    },
    {
        id: '3',
        name: 'Marta Díaz',
        email: 'marta.diaz@example.com',
        role: 'DIRECTOR',
    },
    {
        id: '4',
        name: 'Carlos Peña',
        email: 'carlos.pena@example.com',
        role: 'LEGAL',
    },
    {
        id: '5',
        name: 'Sofía Torres',
        email: 'sofia.torres@example.com',
        role: 'PROCUREMENT',
    },
    {
        id: '6',
        name: 'Jorge Ibarra',
        email: 'jorge.ibarra@example.com',
        role: 'CEO',
    },
];
