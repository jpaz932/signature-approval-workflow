import type { Config } from 'jest';

const config: Config = {
    displayName: 'shared',
    testEnvironment: 'node',
    testMatch: ['<rootDir>/tests/**/*.test.ts'],
    setupFiles: ['<rootDir>/tests/setup-env.ts'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs' } }],
    },
};

export default config;
