// Membros da Comissão (usuarios com perfil presidente, relator ou membro), em tempo real.
// Leitura permitida a admin, presidente e relator (firestore.rules).

import { collection, query, where } from 'firebase/firestore'
import { PERFIS_COMISSAO } from '../../domain/perfis'
import { useConsulta } from '../../lib/firestore'
import type { UsuarioCadastro } from '../../lib/tipos'
import type { MembroComissao } from './FormAberturaSessao'

const ordem = (perfil: string) => (PERFIS_COMISSAO as readonly string[]).indexOf(perfil)

export function useComissao() {
  const leitura = useConsulta<UsuarioCadastro>('usuarios-comissao', (db) =>
    query(collection(db, 'usuarios'), where('perfil', 'in', [...PERFIS_COMISSAO])),
  )
  const membros: MembroComissao[] = leitura.dados
    .map((u) => ({ uid: u.id, email: u.email, perfil: u.perfil! }))
    .sort((a, b) => ordem(a.perfil) - ordem(b.perfil) || (a.email ?? '').localeCompare(b.email ?? ''))
  return { ...leitura, dados: membros }
}

