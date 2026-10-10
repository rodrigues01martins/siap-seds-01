// Leitura do cadastro (usuarios/{uid}) ao entrar no app, separada do React e do Firebase para ser testável.
// Nunca fica em "Carregando…" para sempre: sem resposta em `limiteMs`, sai com o motivo, que a tela mostra.
// Conta sem acesso: pede uma vez o primeiro acesso ao servidor e relê o cadastro direto do servidor.

import { lerAcesso, podeLer, type Acesso } from '../../domain/permissoes'

type Dados = Record<string, unknown> | undefined

export interface FontesCadastro {
  /** Escuta o cadastro em tempo real; devolve a função que para de escutar. */
  ouvir: (aoReceber: (dados: Dados) => void, aoFalhar: (erro: unknown) => void) => () => void
  /** PUT /api/usuarios (primeiro acesso do administrador inicial). */
  pedirPrimeiroAcesso: () => Promise<void>
  /** Lê o cadastro direto do servidor (sem cache). */
  lerDoServidor: () => Promise<Dados>
}

export type EstadoCadastro =
  | { carregando: true }
  | { carregando: false; acesso: Acesso | null; nome: string | null; erro: string | null }

export const SEM_RESPOSTA_SERVIDOR =
  'O servidor (/api/usuarios) não respondeu. Recarregue a página; se continuar, avise o suporte.'
export const SEM_RESPOSTA_FIRESTORE =
  'Não foi possível ler o seu cadastro no Firestore (sem resposta). Verifique a internet ou a rede da instituição e recarregue a página.'

const mensagem = (erro: unknown) => (erro instanceof Error && erro.message ? erro.message : 'Erro desconhecido.')

function comLimite<T>(promessa: Promise<T>, limiteMs: number): Promise<T> {
  return new Promise<T>((resolver, rejeitar) => {
    const relogio = setTimeout(() => rejeitar(new Error(SEM_RESPOSTA_SERVIDOR)), limiteMs)
    promessa.then(
      (valor) => {
        clearTimeout(relogio)
        resolver(valor)
      },
      (erro: unknown) => {
        clearTimeout(relogio)
        rejeitar(erro)
      },
    )
  })
}

export function acompanharCadastro(
  fontes: FontesCadastro,
  aoMudar: (estado: EstadoCadastro) => void,
  limiteMs = 20_000,
): () => void {
  let parado = false
  let pediuPrimeiroAcesso = false
  let erroPrimeiroAcesso: string | null = null
  const emitir = (estado: EstadoCadastro) => {
    if (!parado) aoMudar(estado)
  }
  const pronto = (dados: Dados, erro: string | null) => {
    clearTimeout(relogio)
    const nome = typeof dados?.nome === 'string' ? dados.nome : null
    emitir({ carregando: false, acesso: lerAcesso(dados), nome, erro })
  }

  emitir({ carregando: true })
  const relogio = setTimeout(() => emitir({ carregando: false, acesso: null, nome: null, erro: SEM_RESPOSTA_FIRESTORE }), limiteMs)

  const pararDeOuvir = fontes.ouvir(
    (dados) => {
      if (podeLer(lerAcesso(dados))) return pronto(dados, null)
      if (pediuPrimeiroAcesso) return pronto(dados, erroPrimeiroAcesso)
      pediuPrimeiroAcesso = true
      comLimite(
        fontes.pedirPrimeiroAcesso().then(() => fontes.lerDoServidor()),
        limiteMs,
      ).then(
        (relido) => pronto(relido, null),
        (erro: unknown) => {
          erroPrimeiroAcesso = mensagem(erro)
          pronto(dados, erroPrimeiroAcesso)
        },
      )
    },
    (erro) => {
      const codigo = (erro as { code?: string } | null)?.code
      pronto(undefined, `Não foi possível ler o seu cadastro (${codigo ?? mensagem(erro)}).`)
    },
  )

  return () => {
    parado = true
    clearTimeout(relogio)
    pararDeOuvir()
  }
}
