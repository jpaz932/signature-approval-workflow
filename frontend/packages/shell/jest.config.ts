import type { Config } from 'jest';

const config: Config = {
    displayName: 'shell',
    testEnvironment: 'jsdom',
    testMatch: ['<rootDir>/tests/**/*.test.tsx'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    moduleNameMapper: {
        '\\.css$': '<rootDir>/tests/style-mock.js',
        '^requesterApp/.*$': '<rootDir>/tests/remote-stub.tsx',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs', jsx: 'react-jsx' } }],
    },
};

export default config;
