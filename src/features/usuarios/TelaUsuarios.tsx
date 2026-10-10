// /usuarios (administrador): gestão de usuários. Lista com busca e números; "Gerenciar" abre o painel da
// pessoa (administrador, papel na Comissão, e-mail de senha, desativar e permissões por área, com efeito
// imediato); "Novo usuário" cria a conta e envia o e-mail para a pessoa criar a própria senha.
// Toda gravação passa por /api/usuarios (com histórico).

import { useState, type ReactNode } from 'react'
import { AlertaErro } from '../../componentes/AlertaErro'
import { Botao, EstadoLeitura, Titulo } from '../../componentes/basicos'
import { PAPEIS_COMISSAO, ROTULO_PAPEL, type PapelComissao } from '../../domain/comissao'
import { AREAS, PERMISSOES, type Permissao } from '../../domain/permissoes'
import { camposDoErro } from '../../esquemas/base'
import { esquemaNovoUsuario } from '../../esquemas/usuarios'
import { chamarApi } from '../../lib/api'
import { useColecao } from '../../lib/firestore'
import type { UsuarioCadastro } from '../../lib/tipos'
import { enviarEmailDeSenha } from '../auth/senha'
import { useUsuario } from '../auth/useUsuario'
import {
  alternarPermissao,
  areasLiberadas,
  contagemPermissoes,
  filtrarUsuarios,
  nomeDe,
  ordenarUsuarios,
  resumoUsuarios,
  type LinhaUsuario,
} from './usuarios'

export function TelaUsuarios() {
  const { usuario: eu } = useUsuario()
  const leitura = useColecao<UsuarioCadastro>('usuarios')
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState<string | 'novo' | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const todos = ordenarUsuarios(leitura.dados)
  const visiveis = filtrarUsuarios(todos, busca)
  const numeros = resumoUsuarios(todos)
  const selecionado = todos.find((u) => u.id === aberto) ?? null

  return (
    <>
      <Titulo
        acoes={
          <button type="button" onClick={() => setAberto('novo')} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Novo usuário
          </button>
        }
      >
        Usuários
      </Titulo>
      <p className="-mt-2 mb-4 text-sm text-slate-600">Cadastre usuários e libere o acesso de cada um por área.</p>

      {aviso && (
        <p role="status" className="mb-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {aviso}
        </p>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Numero rotulo="Total de usuários" valor={numeros.total} />
        <Numero rotulo="Administradores" valor={numeros.administradores} />
        <Numero rotulo="Sem nenhum acesso liberado" valor={numeros.semAcesso} />
        <Numero rotulo="Desativados" valor={numeros.desativados} />
      </div>

      <input
        type="search"
        aria-label="Buscar por e-mail ou nome"
        placeholder="Buscar por e-mail ou nome…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2"
      />

      <EstadoLeitura carregando={leitura.carregando} erro={leitura.erro} />
      {!leitura.carregando && !leitura.erro && (
        <section aria-label="Lista de usuários" className="rounded-lg border border-slate-200 bg-white">
          <p className="border-b border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
            {visiveis.length} {visiveis.length === 1 ? 'usuário' : 'usuários'}
          </p>
          <ul>
            {visiveis.map((u) => (
              <ItemUsuario key={u.id} usuario={u} euMesmo={u.id === eu?.uid} onGerenciar={() => setAberto(u.id)} />
            ))}
          </ul>
        </section>
      )}

      {aberto === 'novo' && (
        <PainelNovo
          onFechar={() => setAberto(null)}
          onCriado={(mensagem) => {
            setAberto(null)
            setAviso(mensagem)
          }}
        />
      )}
      {selecionado && <PainelGerenciar usuario={selecionado} euMesmo={selecionado.id === eu?.uid} onFechar={() => setAberto(null)} />}
    </>
  )
}

function Numero({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{rotulo}</p>
      <p className="text-2xl font-semibold">{valor}</p>
    </div>
  )
}

function Selo({ children, cor = 'slate' }: { children: ReactNode; cor?: 'slate' | 'verde' | 'vermelho' }) {
  const cores = { slate: 'bg-slate-100 text-slate-700', verde: 'bg-emerald-100 text-emerald-800', vermelho: 'bg-red-100 text-red-800' }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cores[cor]}`}>{children}</span>
}

function ItemUsuario({ usuario, euMesmo, onGerenciar }: { usuario: LinhaUsuario; euMesmo: boolean; onGerenciar: () => void }) {
  const areas = areasLiberadas(usuario)
  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
      <div className="min-w-56 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {nomeDe(usuario)}
          {usuario.admin && <Selo cor="verde">Admin</Selo>}
          {euMesmo && <Selo>Você</Selo>}
          {usuario.ativo === false && <Selo cor="vermelho">Desativado</Selo>}
        </p>
        <p className="text-sm text-slate-500">{usuario.email}</p>
      </div>
      <div className="flex flex-1 flex-wrap gap-1 text-sm text-slate-600">
        {areas === 'todas' ? 'Todas as áreas' : areas.length === 0 ? <em>Nenhuma área</em> : areas.map((a) => <Selo key={a}>{a}</Selo>)}
      </div>
      <span className="w-24 text-sm text-slate-600">{contagemPermissoes(usuario)}</span>
      <Botao onClick={onGerenciar}>Gerenciar</Botao>
    </li>
  )
}

/** Painel lateral (direita) com fundo escurecido. */
function Painel({ titulo, subtitulo, onFechar, children }: { titulo: string; subtitulo?: ReactNode; onFechar: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-slate-900/40" onClick={onFechar}>
      <div
        role="dialog"
        aria-label={titulo}
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{titulo}</h2>
            {subtitulo && <div className="text-sm text-slate-500">{subtitulo}</div>}
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="text-xl text-slate-500">
            ×
          </button>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  )
}

function Bloco({ titulo, descricao, acao }: { titulo: string; descricao: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
      <div>
        <p className="text-xs font-semibold uppercase text-slate-500">{titulo}</p>
        <div className="text-sm">{descricao}</div>
      </div>
      {acao}
    </div>
  )
}

function Chave({ ligada, rotulo, onAlternar, desabilitada }: { ligada: boolean; rotulo: string; onAlternar: () => void; desabilitada?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligada}
      aria-label={rotulo}
      disabled={desabilitada}
      onClick={onAlternar}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${ligada ? 'bg-emerald-600' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${ligada ? 'left-5' : 'left-0.5'}`} />
    </button>
  )
}

/** Permissões por área, com a contagem de cada área. Administrador: tudo ligado e bloqueado. */
function Permissoes({ ativas, admin, onAlternar, ocupado }: { ativas: readonly Permissao[]; admin: boolean; onAlternar: (p: Permissao) => void; ocupado?: boolean }) {
  return (
    <>
      {AREAS.map((area) => {
        const ligadas = area.permissoes.filter((p) => admin || ativas.includes(p.id)).length
        return (
          <fieldset key={area.id} className="rounded-lg border border-slate-200">
            <legend className="sr-only">{area.rotulo}</legend>
            <div className="flex justify-between border-b border-slate-100 px-3 py-2 text-sm font-semibold">
              <span>{area.rotulo}</span>
              <span className="text-slate-500">
                {ligadas}/{area.permissoes.length}
              </span>
            </div>
            {area.permissoes.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span>{p.rotulo}</span>
                <Chave ligada={admin || ativas.includes(p.id)} rotulo={p.rotulo} desabilitada={admin || ocupado} onAlternar={() => onAlternar(p.id)} />
              </div>
            ))}
          </fieldset>
        )
      })}
    </>
  )
}

function SeletorPapel({ valor, onMudar, desabilitado }: { valor: PapelComissao | null; onMudar: (v: PapelComissao | null) => void; desabilitado?: boolean }) {
  return (
    <select
      aria-label="Papel na Comissão"
      value={valor ?? ''}
      disabled={desabilitado}
      onChange={(e) => onMudar((e.target.value || null) as PapelComissao | null)}
      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
    >
      <option value="">Nenhum</option>
      {PAPEIS_COMISSAO.map((p) => (
        <option key={p} value={p}>
          {ROTULO_PAPEL[p]}
        </option>
      ))}
    </select>
  )
}

function PainelGerenciar({ usuario, euMesmo, onFechar }: { usuario: LinhaUsuario; euMesmo: boolean; onFechar: () => void }) {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<unknown>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const permissoes = (usuario.permissoes ?? []).filter((p): p is Permissao => PERMISSOES.includes(p))
  const admin = usuario.admin === true
  const ativo = usuario.ativo !== false

  async function alterar(dados: Record<string, unknown>, mensagem?: string) {
    setOcupado(true)
    setErro(null)
    setAviso(null)
    try {
      await chamarApi('/api/usuarios', { metodo: 'PATCH', corpo: { uid: usuario.id, ...dados } })
      if (mensagem) setAviso(mensagem)
    } catch (e) {
      setErro(e)
    } finally {
      setOcupado(false)
    }
  }

  async function enviarSenha() {
    setErro(null)
    setAviso(null)
    try {
      await enviarEmailDeSenha(usuario.email)
      setAviso(`E-mail para criar ou redefinir a senha enviado para ${usuario.email}.`)
    } catch (e) {
      setErro(e)
    }
  }

  return (
    <Painel
      titulo={nomeDe(usuario)}
      onFechar={onFechar}
      subtitulo={
        <>
          {usuario.email}
          <br />
          {admin ? 'Administrador: todas as permissões' : `${permissoes.length} de ${PERMISSOES.length} permissões ativas`}
        </>
      }
    >
      <AlertaErro erro={erro} />
      {aviso && (
        <p role="status" className="text-sm text-emerald-800">
          {aviso}
        </p>
      )}
      <Bloco
        titulo="Função"
        descricao={admin ? 'Administrador' : 'Usuário'}
        acao={
          <Botao desabilitado={ocupado || (euMesmo && admin)} onClick={() => alterar({ admin: !admin })}>
            {admin ? 'Remover administrador' : 'Tornar administrador'}
          </Botao>
        }
      />
      <Bloco
        titulo="Senha"
        descricao="Definida pelo próprio usuário"
        acao={<Botao onClick={enviarSenha}>Enviar e-mail para redefinir senha</Botao>}
      />
      <Bloco
        titulo="Papel na Comissão"
        descricao="Aparece na sessão e na ata"
        acao={<SeletorPapel valor={usuario.comissao ?? null} desabilitado={ocupado} onMudar={(comissao) => alterar({ comissao })} />}
      />
      <Bloco
        titulo="Conta"
        descricao={ativo ? 'Ativa' : 'Desativada: não entra no app'}
        acao={
          <Botao perigo={ativo} desabilitado={ocupado || euMesmo} onClick={() => alterar({ ativo: !ativo }, ativo ? 'Conta desativada.' : 'Conta reativada.')}>
            {ativo ? 'Desativar' : 'Reativar'}
          </Botao>
        }
      />
      <Permissoes ativas={permissoes} admin={admin} ocupado={ocupado} onAlternar={(p) => alterar({ permissoes: alternarPermissao(permissoes, p) })} />
    </Painel>
  )
}

function PainelNovo({ onFechar, onCriado }: { onFechar: () => void; onCriado: (mensagem: string) => void }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [admin, setAdmin] = useState(false)
  const [comissao, setComissao] = useState<PapelComissao | null>(null)
  const [permissoes, setPermissoes] = useState<Permissao[]>(['consultar'])
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<unknown>(null)
  const [enviando, setEnviando] = useState(false)

  async function cadastrar() {
    setErro(null)
    const validacao = esquemaNovoUsuario.safeParse({ nome, email, admin, comissao, permissoes: admin ? [] : permissoes })
    if (!validacao.success) {
      setCampos(camposDoErro(validacao.error))
      return
    }
    setCampos({})
    setEnviando(true)
    try {
      await chamarApi('/api/usuarios', { metodo: 'POST', corpo: validacao.data })
      try {
        await enviarEmailDeSenha(validacao.data.email)
        onCriado(`${validacao.data.nome} cadastrado. Enviamos para ${validacao.data.email} o e-mail para criar a senha.`)
      } catch {
        onCriado(`${validacao.data.nome} cadastrado, mas o e-mail não foi enviado. Use "Gerenciar → Enviar e-mail para redefinir senha".`)
      }
    } catch (e) {
      setErro(e)
    } finally {
      setEnviando(false)
    }
  }

  const campoTexto = (rotulo: string, valor: string, mudar: (v: string) => void, chave: string, tipo = 'text') => (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{rotulo}</span>
      <input
        type={tipo}
        value={valor}
        onChange={(e) => mudar(e.target.value)}
        aria-invalid={campos[chave] ? true : undefined}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
      />
      {campos[chave] && <span className="text-sm text-red-700">{campos[chave]}</span>}
    </label>
  )

  return (
    <Painel titulo="Novo usuário" subtitulo="A pessoa recebe um e-mail para criar a própria senha." onFechar={onFechar}>
      <AlertaErro erro={erro} />
      {campoTexto('Nome', nome, setNome, 'nome')}
      {campoTexto('E-mail', email, setEmail, 'email', 'email')}
      <Bloco titulo="Papel na Comissão" descricao="Aparece na sessão e na ata" acao={<SeletorPapel valor={comissao} onMudar={setComissao} />} />
      <Bloco
        titulo="Função"
        descricao={admin ? 'Administrador (todas as permissões)' : 'Usuário'}
        acao={<Chave ligada={admin} rotulo="Administrador" onAlternar={() => setAdmin(!admin)} />}
      />
      <Permissoes ativas={permissoes} admin={admin} onAlternar={(p) => setPermissoes(alternarPermissao(permissoes, p))} />
      <button
        type="button"
        onClick={cadastrar}
        disabled={enviando}
        className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {enviando ? 'Cadastrando…' : 'Cadastrar e enviar e-mail'}
      </button>
    </Painel>
  )
}
