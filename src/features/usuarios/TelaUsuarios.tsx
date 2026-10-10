// /usuarios (ListPage, administrador): gestão de usuários. Números no topo, tabela com busca; "Gerenciar" abre o
// painel da pessoa (administrador, papel na Comissão, e-mail de senha, desativar e permissões por área, com
// efeito imediato); "Novo usuário" cria a conta e envia o e-mail para a pessoa criar a própria senha.
// Toda gravação passa por /api/usuarios (com histórico).

import { KeyRound, ShieldCheck, ShieldOff, UserPlus, UserRoundCog, UserRoundX, UserRoundCheck } from 'lucide-react'
import { useState } from 'react'
import { ListPage } from '../../components/templates/paginas'
import { Alert } from '../../components/ui/Alert'
import { AlertaErroApi } from '../../components/ui/AlertaErroApi'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable } from '../../components/ui/DataTable'
import { Drawer } from '../../components/ui/Drawer'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/StatusBadge'
import { Switch } from '../../components/ui/Switch'
import { TextField } from '../../components/ui/TextField'
import { PAPEIS_COMISSAO, ROTULO_PAPEL, type PapelComissao } from '../../domain/comissao'
import { AREAS, PERMISSOES, type Permissao } from '../../domain/permissoes'
import { camposDoErro } from '../../esquemas/base'
import { esquemaNovoUsuario } from '../../esquemas/usuarios'
import { chamarApi } from '../../lib/api'
import { useColecao } from '../../lib/firestore'
import type { UsuarioCadastro } from '../../lib/tipos'
import { enviarEmailDeSenha } from '../auth/senha'
import { useUsuario } from '../auth/useUsuario'
import { alternarPermissao, areasLiberadas, contagemPermissoes, nomeDe, ordenarUsuarios, resumoUsuarios, type LinhaUsuario } from './usuarios'

const OPCOES_PAPEL = PAPEIS_COMISSAO.map((p) => ({ valor: p, rotulo: ROTULO_PAPEL[p] }))

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
        descricao: 'Cadastre usuários e libere o acesso de cada um por área. As mudanças valem na hora.',
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

      <ul aria-label="Resumo" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ['Total de usuários', numeros.total],
            ['Administradores', numeros.administradores],
            ['Sem nenhum acesso liberado', numeros.semAcesso],
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
                  {u.admin && <Badge tom="info">Admin</Badge>}
                  {u.id === eu?.uid && <Badge tom="neutral">Você</Badge>}
                  {u.ativo === false && <Badge tom="error">Desativado</Badge>}
                </span>
                <span className="block text-caption text-text-muted">{u.email}</span>
              </>
            ),
          },
          {
            id: 'areas',
            titulo: 'Áreas liberadas',
            celula: (u) => {
              const areas = areasLiberadas(u)
              if (areas === 'todas') return 'Todas as áreas'
              if (areas.length === 0) return <em className="text-text-muted">Nenhuma área</em>
              return (
                <span className="flex flex-wrap gap-1">
                  {areas.map((a) => (
                    <Badge key={a} tom="neutral">
                      {a}
                    </Badge>
                  ))}
                </span>
              )
            },
          },
          { id: 'permissoes', titulo: 'Permissões', celula: (u) => contagemPermissoes(u) },
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

/** Permissões por área, com a contagem de cada área. Administrador: tudo ligado e bloqueado. */
function Permissoes({ ativas, admin, onAlternar, ocupado }: { ativas: readonly Permissao[]; admin: boolean; onAlternar: (p: Permissao) => void; ocupado?: boolean }) {
  return (
    <div className="space-y-4">
      {AREAS.map((area) => {
        const ligadas = area.permissoes.filter((p) => admin || ativas.includes(p.id)).length
        return (
          <fieldset key={area.id} className="rounded-card border border-card-border p-4">
            <legend className="px-1 text-label-md text-text-primary">
              {area.rotulo} <span className="text-text-secondary">({ligadas}/{area.permissoes.length})</span>
            </legend>
            <div className="space-y-3">
              {area.permissoes.map((p) => (
                <Switch key={p.id} rotulo={p.rotulo} ligado={admin || ativas.includes(p.id)} desabilitado={admin || ocupado} onMudar={() => onAlternar(p.id)} />
              ))}
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}

function Bloco({ titulo, descricao, children }: { titulo: string; descricao: string; children: React.ReactNode }) {
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
  // Última lista enviada: o próximo clique parte dela, e não da lista na tela, que só atualiza quando o
  // Firestore avisa. Sem isso, cliques seguidos apagavam a permissão ligada no clique anterior.
  const [enviadas, setEnviadas] = useState<Permissao[] | null>(null)
  const naTela = (usuario.permissoes ?? []).filter((p): p is Permissao => PERMISSOES.includes(p))
  const permissoes = enviadas ?? naTela
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
      if (dados.permissoes) setEnviadas(null) // falhou: volta ao que está gravado
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
    <Drawer
      aberto
      titulo={nomeDe(usuario)}
      descricao={`${usuario.email} · ${admin ? 'Administrador: todas as permissões' : `${permissoes.length} de ${PERMISSOES.length} permissões ativas`}`}
      onFechar={onFechar}
    >
      <div className="space-y-4">
        <AlertaErroApi erro={erro} />
        {aviso && (
          <Alert tom="success" titulo="Feito">
            {aviso}
          </Alert>
        )}
        <Bloco titulo="Função" descricao={admin ? 'Administrador' : 'Usuário'}>
          <Button variante="secondary" tamanho="sm" icone={admin ? ShieldOff : ShieldCheck} desabilitado={ocupado || (euMesmo && admin)} onClick={() => void alterar({ admin: !admin })}>
            {admin ? 'Remover administrador' : 'Tornar administrador'}
          </Button>
        </Bloco>
        <Bloco titulo="Senha" descricao="Definida pelo próprio usuário">
          <Button variante="secondary" tamanho="sm" icone={KeyRound} onClick={() => void enviarSenha()}>
            Enviar e-mail para redefinir senha
          </Button>
        </Bloco>
        <Select
          rotulo="Papel na Comissão"
          ajuda="Aparece na sessão e na ata; não dá permissão."
          vazio="Nenhum"
          opcoes={OPCOES_PAPEL}
          value={usuario.comissao ?? ''}
          desabilitado={ocupado}
          onChange={(e) => void alterar({ comissao: (e.target.value || null) as PapelComissao | null })}
        />
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
        <Permissoes
          ativas={permissoes}
          admin={admin}
          ocupado={ocupado}
          onAlternar={(p) => {
            const novas = alternarPermissao(permissoes, p)
            setEnviadas(novas)
            void alterar({ permissoes: novas })
          }}
        />
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
        <Select
          rotulo="Papel na Comissão"
          ajuda="Aparece na sessão e na ata; não dá permissão."
          vazio="Nenhum"
          opcoes={OPCOES_PAPEL}
          value={comissao ?? ''}
          onChange={(e) => setComissao((e.target.value || null) as PapelComissao | null)}
        />
        <Switch rotulo="Administrador (todas as permissões e a gestão de usuários)" ligado={admin} onMudar={setAdmin} />
        <Permissoes ativas={permissoes} admin={admin} onAlternar={(p) => setPermissoes(alternarPermissao(permissoes, p))} />
      </div>
    </Drawer>
  )
}
