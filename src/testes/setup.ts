// Configuração dos testes de componentes (Testing Library + jsdom).
// Cada arquivo .test.tsx declara `// @vitest-environment jsdom`.

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
