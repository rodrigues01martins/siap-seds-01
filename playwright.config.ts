// Testes de navegador (Playwright) contra o app local e os emuladores do Firebase.
// Rodar com: npm run test:e2e:baseline (sobe Auth + Firestore emulados e o Vite com VITE_USAR_EMULADORES).
import { defineConfig } from '@playwright/test'

const PORTA = 5175

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/semear.ts',
  workers: 1,
  timeout: 10 * 60_000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {},
  },
  webServer: {
    command: `npx vite --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_FIREBASE_API_KEY: 'chave-falsa',
      VITE_FIREBASE_AUTH_DOMAIN: 'localhost',
      VITE_FIREBASE_PROJECT_ID: 'demo-siap-seds',
      VITE_FIREBASE_APP_ID: '1:1:web:e2e',
      VITE_USAR_EMULADORES: 'true',
    },
  },
})
