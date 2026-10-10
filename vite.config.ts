/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts', 'scripts/**/*.test.ts', 'tests/design/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['src/testes/setup.ts'],
    // Os relatórios leem src/styles/tokens.css como texto (?raw); sem isto o Vitest entrega CSS vazio.
    css: { include: [/tokens\.css/] },
  },
})
