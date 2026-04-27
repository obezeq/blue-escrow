import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    globalSetup: ['./test/globalSetup.ts'],
    include: ['src/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**', 'src/generated/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/config/**', 'src/shared/**'],
      exclude: [
        '**/*.test.ts',
        'src/generated/**',
        'src/shared/errors/index.ts',
        // Thin pino wrapper; dev-only branch runs at module load, not under test.
        'src/shared/utils/logger.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 80,
        statements: 80,
      },
    },
  },
});
