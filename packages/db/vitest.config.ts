import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Plain Node: these tests boot Postgres in WebAssembly and never touch a DOM.
    environment: 'node',
    // Each file gets its own database, and booting one costs a moment. Running
    // files in the same process keeps the WASM module warm between them.
    pool: 'threads',
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
