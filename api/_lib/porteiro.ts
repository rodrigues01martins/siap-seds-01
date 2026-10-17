// Porteiro: valida o ID token do Firebase (login) e confere o perfil no cadastro usuarios/{uid}
// (perfil admin ou presidente, ativo). Lido a cada chamada: mudar o perfil vale na hora.
// Admin e presidente fazem tudo; só o admin gerencia usuários (exigência 'admin').

import { ACESSO_DESATUALIZADO, lerAcesso, podeFazer, precisaAtualizarAcesso, type Acesso, type Exigencia, type Perfil } from '../../src/domain/permissoes.js'
import { obterAdmin } from './admin.js'
import { ErroApi, MENSAGENS } from './erros.js'

/** Quem grava (vai para o histórico): uid, e-mail e perfil. */
export interface Assinatura {
  uid: string
  email: string | null
  perfil: Perfil
}

export interface Autor extends Assinatura {
  acesso: Acesso
}

/** Quem está chamando: ID token válido (401 se ausente, inválido ou revogado) e o cadastro, se houver. */
export async function identificar(
  requisicao: Request,
): Promise<{ uid: string; email: string | null; acesso: Acesso | null }> {
  const cabecalho = requisicao.headers.get('Authorization') ?? ''
  const token = /^Bearer\s+(\S+)$/i.exec(cabecalho)?.[1]
  if (!token) throw new ErroApi(401, MENSAGENS.semLogin)

  // Fora do try: falta de configuração do servidor é erro 500 (com log), não "sessão inválida".
  const { auth, db } = obterAdmin()
  let decodificado
  try {
    // checkRevoked: conta desativada (sessões revogadas) deixa de valer imediatamente.
    decodificado = await auth.verifyIdToken(token, true)
  } catch {
    throw new ErroApi(401, MENSAGENS.sessaoInvalida)
  }
  const cadastro = await db.doc(`usuarios/${decodificado.uid}`).get()
  return { uid: decodificado.uid, email: decodificado.email ?? null, acesso: lerAcesso(cadastro.data()) }
}

/**
 * Lê "Authorization: Bearer <ID token>". Sem token ou token inválido/revogado → 401; cadastro do modelo
 * anterior (sem perfil) → 403 pedindo a atualização; sem cadastro, desativado ou presidente na gestão de
 * usuários → 403.
 */
export async function autenticar(requisicao: Request, exigencia: Exigencia = 'usuario'): Promise<Autor> {
  const { uid, email, acesso } = await identificar(requisicao)
  if (precisaAtualizarAcesso(acesso)) throw new ErroApi(403, ACESSO_DESATUALIZADO)
  if (!podeFazer(acesso, exigencia)) throw new ErroApi(403, MENSAGENS.semPermissao)
  return { uid, email, perfil: acesso!.perfil!, acesso: acesso! }
}
