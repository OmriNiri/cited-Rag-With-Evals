import { defineConfig } from 'vitest/config';

// Integration tests: real Postgres (+ the real embedding model where needed).
// Kept apart from unit tests (`npm test`), which must run with nothing else running.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.int-spec.ts'],
    // Loading MiniLM can take several seconds, longer on a cold CI machine.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
