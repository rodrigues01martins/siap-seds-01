// Testes da /api contra os emuladores de Auth e Firestore (use `npm run test:api`).
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/api/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
})
