// Ambiente do projeto Firebase em que a /api grava, mostrado em destaque na limpeza da base: o de produção
// (.firebaserc, projects.prod) é PRODUÇÃO; o de desenvolvimento e o dos emuladores (demo-…), DEV.

import type { Ambiente } from '../../src/esquemas/limpeza.js'

export const PROJETO_PRODUCAO = 'siap-seds-01'

export function ambienteDoProjeto(projectId: string): Ambiente {
  return projectId === PROJETO_PRODUCAO ? 'PRODUÇÃO' : 'DEV'
}
