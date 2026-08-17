import type { Config } from 'jest';

const config: Config = {
    projects: [
        '<rootDir>/packages/shared',
        '<rootDir>/packages/shell',
        '<rootDir>/packages/requester-app',
    ],
    collectCoverageFrom: [
        'packages/*/src/**/*.{ts,tsx}',
        '!packages/*/src/**/*.d.ts',
        '!packages/*/src/index.{ts,tsx}',
    ],
};

export default config;
