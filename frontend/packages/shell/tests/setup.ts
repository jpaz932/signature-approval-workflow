import { TextDecoder, TextEncoder } from 'node:util';
import '@testing-library/jest-dom';

// jsdom doesn't provide these globals, but react-router-dom's dependency chain needs them.
Object.assign(globalThis, { TextEncoder, TextDecoder });
