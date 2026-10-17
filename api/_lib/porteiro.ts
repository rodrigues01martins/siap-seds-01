// Porteiro: valida o ID token do Firebase (login) e confere o acesso no cadastro usuarios/{uid}
// (admin, permissoes, ativo). Lido a cada chamada: liberar ou retirar uma permissão vale na hora.

import { lerAcesso, podeFazer, type Acesso, type Exigencia } from '../../src/domain/permissoes.js'
import { obterAdmin } from './admin.js'
import { ErroApi, MENSAGENS } from './erros.js'

/** Quem grava (vai para o histórico): perfil = 'admin' ou 'presidente'. */
export interface Assinatura {
  uid: string
  email: string | null
  perfil: 'admin' | 'presidente'
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
 * Lê "Authorization: Bearer <ID token>". Sem token ou token inválido/revogado → 401;
 * sem cadastro, conta desativada ou sem a permissão exigida → 403. Administrador passa em tudo.
 */
export async function autenticar(requisicao: Request, exigencia: Exigencia = 'consultar'): Promise<Autor> {
  const { uid, email, acesso } = await identificar(requisicao)
  if (!acesso || !podeFazer(acesso, exigencia)) throw new ErroApi(403, MENSAGENS.semPermissao)
  return { uid, email, perfil: acesso.admin ? 'admin' : 'presidente', acesso }
}
