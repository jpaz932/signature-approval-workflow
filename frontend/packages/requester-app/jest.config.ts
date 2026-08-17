import type { Config } from 'jest';

const config: Config = {
    displayName: 'requester-app',
    testEnvironment: 'jsdom',
    testMatch: ['<rootDir>/tests/**/*.test.tsx'],
    setupFiles: ['<rootDir>/tests/setup-env.ts'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    moduleNameMapper: {
        '\\.css$': '<rootDir>/tests/style-mock.js',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs', jsx: 'react-jsx' } }],
    },
};

export default config;
