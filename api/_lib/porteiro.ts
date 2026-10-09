// Porteiro: valida o ID token do Firebase e confere o perfil (custom claim "perfil").

import { extrairPerfil, type Perfil } from '../../src/domain/perfis.js'
import { obterAdmin } from './admin.js'
import { ErroApi, MENSAGENS } from './erros.js'

export interface Autor {
  uid: string
  email: string | null
  perfil: Perfil
}

/**
 * Lê "Authorization: Bearer <ID token>". Sem token ou token inválido/revogado → 401;
 * perfil ausente ou fora de `permitidos` → 403.
 */
export async function autenticar(requisicao: Request, permitidos: readonly Perfil[]): Promise<Autor> {
  const cabecalho = requisicao.headers.get('Authorization') ?? ''
  const token = /^Bearer\s+(\S+)$/i.exec(cabecalho)?.[1]
  if (!token) throw new ErroApi(401, MENSAGENS.semLogin)

  let decodificado
  try {
    // checkRevoked: perfil removido (sessões revogadas) deixa de valer imediatamente.
    decodificado = await obterAdmin().auth.verifyIdToken(token, true)
  } catch {
    throw new ErroApi(401, MENSAGENS.sessaoInvalida)
  }

  const perfil = extrairPerfil(decodificado)
  if (!perfil || !permitidos.includes(perfil)) throw new ErroApi(403, MENSAGENS.semPermissao)
  return { uid: decodificado.uid, email: decodificado.email ?? null, perfil }
}
