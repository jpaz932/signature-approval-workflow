import { TextDecoder, TextEncoder } from 'node:util';
import '@testing-library/jest-dom';

// jsdom doesn't provide these globals, but some transitive dependencies need them.
Object.assign(globalThis, { TextEncoder, TextDecoder });
