// Testes das regras do Firestore: exigem o emulador (use `npm run test:regras`).
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/regras/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
})
