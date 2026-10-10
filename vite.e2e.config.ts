// Configuração do Vite só para os testes de navegador (playwright.config.ts): a do app + a /api montada
// no servidor de desenvolvimento (tests/e2e/apiNoVite.ts), gravando nos emuladores.
import { defineConfig, mergeConfig } from 'vite'
import base from './vite.config'
import { apiNoVite } from './tests/e2e/apiNoVite'

export default mergeConfig(base, defineConfig({ plugins: [apiNoVite()] }))
