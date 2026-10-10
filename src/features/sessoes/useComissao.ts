// Membros da Comissão (usuarios com papel presidente, relator ou membro), em tempo real.
// Leitura permitida a quem tem acesso ao app (firestore.rules).

import { collection, query, where } from 'firebase/firestore'
import { PAPEIS_COMISSAO } from '../../domain/comissao'
import { useConsulta } from '../../lib/firestore'
import type { UsuarioCadastro } from '../../lib/tipos'
import type { MembroComissao } from './FormAberturaSessao'

const ordem = (papel: string) => (PAPEIS_COMISSAO as readonly string[]).indexOf(papel)

export function useComissao() {
  const leitura = useConsulta<UsuarioCadastro>('usuarios-comissao', (db) =>
    query(collection(db, 'usuarios'), where('comissao', 'in', [...PAPEIS_COMISSAO])),
  )
  const membros: MembroComissao[] = leitura.dados
    .filter((u) => u.ativo !== false)
    .map((u) => ({ uid: u.id, email: u.email, perfil: u.comissao! }))
    .sort((a, b) => ordem(a.perfil) - ordem(b.perfil) || (a.email ?? '').localeCompare(b.email ?? ''))
  return { ...leitura, dados: membros }
}
