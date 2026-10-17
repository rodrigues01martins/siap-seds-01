// /usuarios (ListPage, só o admin): gestão de usuários. Números no topo e tabela com busca; "Gerenciar" abre o
// painel da pessoa (perfil admin ou presidente, e-mail de senha e desativar, com efeito imediato); "Novo usuário"
// cria a conta com o perfil e envia o e-mail para a pessoa criar a própria senha. Cadastro do modelo anterior
// (relator, membro, controle) aparece como "Precisa de perfil" até receber um. Toda gravação passa por
// /api/usuarios (com histórico).

import { KeyRound, UserPlus, UserRoundCheck, UserRoundCog, UserRoundX } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ListPage } from '../../components/templates/paginas'
import { Alert } from '../../components/ui/Alert'
import { AlertaErroApi } from '../../components/ui/AlertaErroApi'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable } from '../../components/ui/DataTable'
import { Drawer } from '../../components/ui/Drawer'
import { RadioGroup } from '../../components/ui/RadioGroup'
import { Badge } from '../../components/ui/StatusBadge'
import { TextField } from '../../components/ui/TextField'
import { ACESSO_DESATUALIZADO, DESCRICAO_PERFIL, PERFIS, ROTULO_PERFIL, type Perfil } from '../../domain/permissoes'
import { camposDoErro } from '../../esquemas/base'
import { esquemaNovoUsuario } from '../../esquemas/usuarios'
import { chamarApi } from '../../lib/api'
import { useColecao } from '../../lib/firestore'
import type { UsuarioCadastro } from '../../lib/tipos'
import { enviarEmailDeSenha } from '../auth/senha'
import { useUsuario } from '../auth/useUsuario'
import { nomeDe, ordenarUsuarios, perfilDe, resumoUsuarios, type LinhaUsuario } from './usuarios'

const OPCOES_PERFIL = PERFIS.map((p) => ({ valor: p, rotulo: ROTULO_PERFIL[p], ajuda: DESCRICAO_PERFIL[p] }))

/** Perfil em selo; cadastro antigo, sem perfil: "Precisa de perfil". */
function SeloPerfil({ usuario }: { usuario: UsuarioCadastro }) {
  const perfil = perfilDe(usuario)
  if (!perfil) return <Badge tom="warning">Precisa de perfil</Badge>
  return <Badge tom={perfil === 'admin' ? 'info' : 'neutral'}>{ROTULO_PERFIL[perfil]}</Badge>
}

export function TelaUsuarios() {
  const { usuario: eu } = useUsuario()
  const leitura = useColecao<UsuarioCadastro>('usuarios')
  const [aberto, setAberto] = useState<string | 'novo' | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const todos = ordenarUsuarios(leitura.dados)
  const numeros = resumoUsuarios(todos)
  const selecionado = todos.find((u) => u.id === aberto) ?? null

  return (
    <ListPage
      cabecalho={{
        trilha: [{ rotulo: 'Chamamentos', para: '/' }, { rotulo: 'Usuários' }],
        titulo: 'Usuários',
        descricao: 'Cadastre usuários com o perfil admin ou presidente. Os dois fazem tudo no sistema; só o admin gerencia usuários.',
        acaoPrimaria: (
          <Button icone={UserPlus} onClick={() => setAberto('novo')}>
            Novo usuário
          </Button>
        ),
      }}
    >
      {aviso && (
        <Alert tom="success" titulo="Usuário cadastrado" onFechar={() => setAviso(null)}>
          {aviso}
        </Alert>
      )}

      <ul aria-label="Resumo" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {(
          [
            ['Total de usuários', numeros.total],
            ['Administradores', numeros.administradores],
            ['Presidentes', numeros.presidentes],
            ['Acesso a atualizar', numeros.acessoAtualizar],
            ['Desativados', numeros.desativados],
          ] as const
        ).map(([rotulo, valor]) => (
          <li key={rotulo} className="rounded-card border border-card-border bg-card-bg px-4 py-3 shadow-card">
            <p className="text-label-md text-text-secondary">{rotulo}</p>
            <p className="text-heading-2 text-text-primary">{valor}</p>
          </li>
        ))}
      </ul>

      <DataTable<LinhaUsuario>
        rotulo="Usuários cadastrados"
        linhas={todos}
        chave={(u) => u.id}
        carregando={leitura.carregando}
        erro={leitura.erro}
        busca={{ rotulo: 'Buscar por e-mail ou nome', texto: (u) => `${u.nome ?? ''} ${u.email}` }}
        vazio={{ titulo: 'Nenhum usuário encontrado' }}
        colunas={[
          {
            id: 'nome',
            titulo: 'Usuário',
            ordenar: (u) => nomeDe(u),
            celula: (u) => (
              <>
                <span className="flex flex-wrap items-center gap-2 font-semibold">
                  {nomeDe(u)}
                  {u.id === eu?.uid && <Badge tom="neutral">Você</Badge>}
                  {u.ativo === false && <Badge tom="error">Desativado</Badge>}
                </span>
                <span className="block text-caption text-text-muted">{u.email}</span>
              </>
            ),
          },
          { id: 'perfil', titulo: 'Perfil', ordenar: (u) => perfilDe(u) ?? '', celula: (u) => <SeloPerfil usuario={u} /> },
        ]}
        acoes={(u) => (
          <Button variante="tertiary" tamanho="sm" icone={UserRoundCog} aria-label={`Gerenciar ${nomeDe(u)}`} onClick={() => setAberto(u.id)}>
            Gerenciar
          </Button>
        )}
      />

      {aberto === 'novo' && (
        <PainelNovo
          onFechar={() => setAberto(null)}
          onCriado={(mensagem) => {
            setAberto(null)
            setAviso(mensagem)
          }}
        />
      )}
      {selecionado && <PainelGerenciar key={selecionado.id} usuario={selecionado} euMesmo={selecionado.id === eu?.uid} onFechar={() => setAberto(null)} />}
    </ListPage>
  )
}

function Bloco({ titulo, descricao, children }: { titulo: string; descricao: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-card-border p-4">
      <div>
        <p className="text-label-md text-text-primary">{titulo}</p>
        <p className="text-body-sm text-text-secondary">{descricao}</p>
      </div>
      {children}
    </div>
  )
}

function PainelGerenciar({ usuario, euMesmo, onFechar }: { usuario: LinhaUsuario; euMesmo: boolean; onFechar: () => void }) {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<unknown>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [confirmarDesativar, setConfirmarDesativar] = useState(false)
  const perfil = perfilDe(usuario)
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
    <Drawer aberto titulo={nomeDe(usuario)} descricao={`${usuario.email} · ${perfil ? ROTULO_PERFIL[perfil] : 'sem perfil'}`} onFechar={onFechar}>
      <div className="space-y-4">
        <AlertaErroApi erro={erro} />
        {aviso && (
          <Alert tom="success" titulo="Feito">
            {aviso}
          </Alert>
        )}
        {!perfil && ativo && (
          <Alert tom="warning" titulo="Cadastro do modelo anterior" papel="status">
            A pessoa vê “{ACESSO_DESATUALIZADO}” Escolha um perfil para liberar o acesso.
          </Alert>
        )}
        <RadioGroup
          rotulo="Perfil"
          name={`perfil-${usuario.id}`}
          opcoes={OPCOES_PERFIL}
          valor={perfil ?? ''}
          desabilitado={ocupado || euMesmo}
          ajuda={euMesmo ? 'Você não pode tirar o seu próprio perfil de administrador.' : 'Vale na hora, sem a pessoa sair e entrar.'}
          onChange={(e) => void alterar({ perfil: e.target.value as Perfil }, 'Perfil atualizado.')}
        />
        <Bloco titulo="Senha" descricao="Definida pelo próprio usuário">
          <Button variante="secondary" tamanho="sm" icone={KeyRound} onClick={() => void enviarSenha()}>
            Enviar e-mail para redefinir senha
          </Button>
        </Bloco>
        <Bloco titulo="Conta" descricao={ativo ? 'Ativa' : 'Desativada: não entra no app'}>
          {ativo ? (
            <Button variante="destructive" tamanho="sm" icone={UserRoundX} desabilitado={ocupado || euMesmo} onClick={() => setConfirmarDesativar(true)}>
              Desativar
            </Button>
          ) : (
            <Button variante="secondary" tamanho="sm" icone={UserRoundCheck} desabilitado={ocupado} onClick={() => void alterar({ ativo: true }, 'Conta reativada.')}>
              Reativar
            </Button>
          )}
        </Bloco>
      </div>
      <ConfirmDialog
        aberto={confirmarDesativar}
        titulo={`Desativar ${nomeDe(usuario)}?`}
        mensagem="A pessoa perde o acesso ao app na hora e as sessões abertas são encerradas. Dá para reativar depois."
        rotuloConfirmar="Desativar"
        confirmando={ocupado}
        onCancelar={() => setConfirmarDesativar(false)}
        onConfirmar={() => {
          setConfirmarDesativar(false)
          void alterar({ ativo: false }, 'Conta desativada.')
        }}
      />
    </Drawer>
  )
}

function PainelNovo({ onFechar, onCriado }: { onFechar: () => void; onCriado: (mensagem: string) => void }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [perfil, setPerfil] = useState<Perfil>('presidente')
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<unknown>(null)
  const [enviando, setEnviando] = useState(false)

  async function cadastrar() {
    setErro(null)
    const validacao = esquemaNovoUsuario.safeParse({ nome, email, perfil })
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

  return (
    <Drawer
      aberto
      titulo="Novo usuário"
      descricao="A pessoa recebe um e-mail para criar a própria senha."
      onFechar={onFechar}
      rodape={
        <>
          <Button variante="secondary" onClick={onFechar}>
            Cancelar
          </Button>
          <Button icone={UserPlus} carregando={enviando} onClick={() => void cadastrar()}>
            Cadastrar e enviar e-mail
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <AlertaErroApi erro={erro} />
        <TextField rotulo="Nome" obrigatorio value={nome} onChange={(e) => setNome(e.target.value)} erro={campos.nome} />
        <TextField rotulo="E-mail" type="email" obrigatorio value={email} onChange={(e) => setEmail(e.target.value)} erro={campos.email} />
        <RadioGroup
          rotulo="Perfil"
          name="perfil-novo"
          obrigatorio
          opcoes={OPCOES_PERFIL}
          valor={perfil}
          erro={campos.perfil}
          onChange={(e) => setPerfil(e.target.value as Perfil)}
        />
      </div>
    </Drawer>
  )
}
