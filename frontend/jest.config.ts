import type { Config } from 'jest';

const config: Config = {
    projects: ['<rootDir>/packages/shared'],
    collectCoverageFrom: ['packages/*/src/**/*.{ts,tsx}', '!packages/*/src/**/*.d.ts'],
};

export default config;
