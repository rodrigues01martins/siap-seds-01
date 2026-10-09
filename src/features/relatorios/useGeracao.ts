// Estado comum dos botões que geram documentos no navegador: qual está gerando, erro e o rodapé
// (gerado em, por quem, versão da matriz e código de verificação dos dados usados).

import { useState } from 'react'
import { MATRIZ_2026 } from '../../domain/matriz'
import type { Rodape } from '../../relatorios/documento'
import { codigoVerificacao } from '../../relatorios/verificacao'
import { useUsuario } from '../auth/useUsuario'

export function useGeracao() {
  const { usuario } = useUsuario()
  const [gerando, setGerando] = useState<string | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const geradoPor = usuario?.email ?? usuario?.uid ?? 'usuário não identificado'

  async function rodape(dadosUsados: unknown): Promise<Rodape> {
    return { geradoEm: new Date(), geradoPor, versaoMatriz: MATRIZ_2026.versao, codigo: await codigoVerificacao(dadosUsados) }
  }

  async function gerar(rotulo: string, tarefa: () => Promise<void>) {
    setErro(null)
    setGerando(rotulo)
    try {
      await tarefa()
    } catch (e) {
      setErro(e)
    } finally {
      setGerando(null)
    }
  }

  return { gerando, erro, gerar, rodape }
}
