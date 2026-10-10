// /ui (somente administrador): catálogo interno da biblioteca src/components/ui, com cada componente em todos
// os estados. Serve de referência para as próximas etapas e é verificado pelo axe (tests/e2e/catalogo.spec.ts).

import { Download, FileText, Plus, Save, Search, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert } from '../../components/ui/Alert'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import { Button, type TamanhoBotao, type VarianteBotao } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { CNPJField } from '../../components/ui/CNPJField'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { CurrencyField } from '../../components/ui/CurrencyField'
import { DataTable, type ColunaTabela } from '../../components/ui/DataTable'
import { DatePicker } from '../../components/ui/DatePicker'
import { Dialog } from '../../components/ui/Dialog'
import { Drawer } from '../../components/ui/Drawer'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { resolverZod } from '../../components/ui/form'
import { Icone } from '../../components/ui/Icone'
import { NumberField } from '../../components/ui/NumberField'
import { RadioGroup } from '../../components/ui/RadioGroup'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'
import { Spinner } from '../../components/ui/Spinner'
import { MAPA_STATUS, StatusBadge, type StatusSelo } from '../../components/ui/StatusBadge'
import { Switch } from '../../components/ui/Switch'
import { Tabs } from '../../components/ui/Tabs'
import { TextArea } from '../../components/ui/TextArea'
import { TextField } from '../../components/ui/TextField'
import { ToastProvider, useToast } from '../../components/ui/Toast'
import { cnpj } from '../../esquemas/base'

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  const id = `secao-${titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <section aria-labelledby={id} className="rounded-card border border-card-border bg-card-bg p-(--sds-card-padding) shadow-card">
      <h2 id={id} className="text-heading-2 text-text-primary">
        {titulo}
      </h2>
      {descricao && <p className="mt-1 text-body-sm text-text-secondary">{descricao}</p>}
      <div className="mt-6 space-y-6">{children}</div>
    </section>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-heading-4 text-text-primary">{titulo}</h3>
      {children}
    </div>
  )
}

const VARIANTES: VarianteBotao[] = ['primary', 'secondary', 'tertiary', 'destructive']
const TAMANHOS: TamanhoBotao[] = ['sm', 'md', 'lg']

function Botoes() {
  return (
    <Secao titulo="Botões" descricao="Variantes, tamanhos 32/40/48 e estados. Hover, foco (Tab) e pressionado: interaja com cada botão.">
      {VARIANTES.map((v) => (
        <Grupo key={v} titulo={`Variante ${v}`}>
          <div className="flex flex-wrap items-center gap-3">
            {TAMANHOS.map((t) => (
              <Button key={t} variante={v} tamanho={t}>
                {`${v} ${t}`}
              </Button>
            ))}
            <Button variante={v} icone={v === 'destructive' ? Trash2 : Save}>
              Com ícone
            </Button>
            <Button variante={v} desabilitado>
              Desabilitado
            </Button>
            <Button variante={v} carregando>
              Carregando
            </Button>
          </div>
        </Grupo>
      ))}
    </Secao>
  )
}

function Campos() {
  const [ligado, setLigado] = useState(true)
  const [valor, setValor] = useState<number | null>(1250000)
  return (
    <Secao titulo="Campos" descricao="Estados: default, hover, foco, preenchido, desabilitado, somente leitura, erro e sucesso.">
      <Grupo titulo="Texto">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField rotulo="Padrão" ajuda="Texto de ajuda do campo." placeholder="Digite aqui" />
          <TextField rotulo="Preenchido" defaultValue="Instituto Esperança" />
          <TextField rotulo="Obrigatório" obrigatorio />
          <TextField rotulo="Desabilitado" desabilitado defaultValue="Não editável" />
          <TextField rotulo="Somente leitura" somenteLeitura defaultValue="00000.000000/2026-00" />
          <TextField rotulo="Com erro" erro="Informe o número do processo SEI." defaultValue="123" />
          <TextField rotulo="Com sucesso" sucesso="Número conferido." defaultValue="202610319003258" />
          <TextField rotulo="Busca" type="search" placeholder="Buscar por OSC" />
        </div>
      </Grupo>
      <Grupo titulo="Área de texto, seleção, data e número">
        <div className="grid gap-4 md:grid-cols-2">
          <TextArea rotulo="Justificativa" minimo={20} maximo={2000} ajuda="Fundamente o nível atribuído." />
          <TextArea rotulo="Justificativa com erro" minimo={20} defaultValue="Curta" erro="Use ao menos 20 caracteres." />
          <Select rotulo="Lote" vazio="Selecione…" opcoes={[{ valor: 'L1', rotulo: 'L1 — CASE Goiânia' }, { valor: 'L2', rotulo: 'L2 — CASE Anápolis' }]} />
          <Select rotulo="Lote (desabilitado)" desabilitado opcoes={[{ valor: 'L1', rotulo: 'L1 — CASE Goiânia' }]} />
          <DatePicker rotulo="Prazo da diligência" min="2026-01-01" />
          <NumberField rotulo="Vagas" min={0} defaultValue={40} />
        </div>
      </Grupo>
      <Grupo titulo="Valores e documentos">
        <div className="grid gap-4 md:grid-cols-2">
          <CurrencyField rotulo="Valor anual" valor={valor} onMudar={setValor} ajuda="Digite só os números; os centavos entram pela direita." />
          <CNPJField rotulo="CNPJ" ajuda="Numérico ou alfanumérico (IN RFB 2.229/2024)." />
          <CNPJField rotulo="CNPJ com erro" defaultValue="11.222.333/0001-80" erro="CNPJ inválido." />
        </div>
      </Grupo>
      <Grupo titulo="Seleção">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-3">
            <Checkbox rotulo="Sem impedimento" defaultChecked />
            <Checkbox rotulo="Não marcado" />
            <Checkbox rotulo="Desabilitado" desabilitado />
            <Checkbox rotulo="Com erro" erro="Confirme a declaração." />
          </div>
          <RadioGroup
            rotulo="Decisão da Comissão"
            name="catalogo-decisao"
            defaultValue="unanimidade"
            opcoes={[
              { valor: 'unanimidade', rotulo: 'Unanimidade' },
              { valor: 'maioria', rotulo: 'Maioria', ajuda: 'Exige o voto divergente.' },
            ]}
          />
          <div className="space-y-3">
            <Switch rotulo="Somente pendentes" ligado={ligado} onMudar={setLigado} />
            <Switch rotulo="Desligado" ligado={false} onMudar={() => {}} />
            <Switch rotulo="Desabilitado" ligado desabilitado onMudar={() => {}} />
          </div>
        </div>
      </Grupo>
    </Secao>
  )
}

const esquemaExemplo = z.object({
  nome: z.string().trim().min(3, 'Informe o nome da OSC (ao menos 3 letras).'),
  cnpj,
  valorCentavos: z.number({ error: 'Informe o valor.' }).int().positive('Informe o valor.'),
})

function FormularioExemplo() {
  const { mostrar } = useToast()
  const { register, control, handleSubmit, formState } = useForm({
    resolver: resolverZod(esquemaExemplo),
    defaultValues: { nome: '', cnpj: '', valorCentavos: null as unknown as number },
  })
  const e = formState.errors
  return (
    <Secao titulo="Formulário (react-hook-form + zod)" descricao="Envie vazio para ver os erros; os valores válidos aparecem num toast.">
      <form
        noValidate
        onSubmit={handleSubmit((dados) => mostrar({ tom: 'success', titulo: 'Formulário válido', mensagem: JSON.stringify(dados) }))}
        className="grid gap-4 md:grid-cols-3"
      >
        <TextField rotulo="Nome da OSC" obrigatorio erro={e.nome?.message} {...register('nome')} />
        <CNPJField rotulo="CNPJ da OSC" obrigatorio erro={e.cnpj?.message} {...register('cnpj')} />
        <Controller
          control={control}
          name="valorCentavos"
          render={({ field }) => <CurrencyField rotulo="Valor" obrigatorio valor={field.value} onMudar={field.onChange} onBlur={field.onBlur} erro={e.valorCentavos?.message} />}
        />
        <div className="md:col-span-3">
          <Button type="submit" icone={Save}>
            Validar
          </Button>
        </div>
      </form>
    </Secao>
  )
}

function Feedback() {
  const { mostrar } = useToast()
  return (
    <Secao titulo="Feedback" descricao="Status com ponto + texto, alertas, toast, carregamento, vazio e erro.">
      <Grupo titulo="Status da proposta (mapeamento de cor)">
        <ul className="flex flex-wrap gap-3">
          {(Object.keys(MAPA_STATUS) as StatusSelo[]).map((s) => (
            <li key={s}>
              <StatusBadge status={s} />
            </li>
          ))}
        </ul>
      </Grupo>
      <Grupo titulo="Alertas">
        <div className="space-y-3">
          <Alert tom="info" titulo="Sessão aberta">
            A pauta tem 6 propostas.
          </Alert>
          <Alert tom="success" titulo="Proposta homologada" acao={<Button variante="secondary" tamanho="sm">Ver espelho</Button>}>
            A NF ficou bloqueada para alteração.
          </Alert>
          <Alert tom="warning" titulo="Classificação não definitiva" onFechar={() => {}}>
            1 proposta pendente; 1 empate sem decisão.
          </Alert>
          <Alert tom="error" titulo="Não foi possível salvar">
            Sem conexão com o servidor. Tente novamente.
          </Alert>
        </div>
      </Grupo>
      <Grupo titulo="Toast">
        <div className="flex flex-wrap gap-3">
          {(['success', 'info', 'warning', 'error'] as const).map((tom) => (
            <Button key={tom} variante="secondary" onClick={() => mostrar({ tom, titulo: `Toast ${tom}`, mensagem: 'Some sozinho em 6 segundos.' })}>
              {`Mostrar ${tom}`}
            </Button>
          ))}
        </div>
      </Grupo>
      <Grupo titulo="Carregamento">
        <div className="flex flex-wrap items-start gap-8">
          <Spinner rotulo="Carregando exemplo" />
          <Skeleton linhas={3} rotulo="Carregando lista de exemplo" className="w-64" />
        </div>
      </Grupo>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-card-border">
          <EmptyState icone={FileText} titulo="Nenhuma proposta neste lote" descricao="Cadastre a primeira proposta para começar." acao={<Button icone={Plus}>Nova proposta</Button>} />
        </div>
        <div className="rounded-card border border-card-border">
          <ErrorState mensagem="Sem conexão com o servidor." onTentarNovamente={() => {}} />
        </div>
      </div>
    </Secao>
  )
}

function OverlaysENavegacao() {
  const [dialogo, setDialogo] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [painel, setPainel] = useState(false)
  return (
    <Secao titulo="Overlays e navegação" descricao="Foco preso, Esc fecha e o foco volta ao botão que abriu.">
      <div className="flex flex-wrap gap-3">
        <Button variante="secondary" onClick={() => setDialogo(true)}>
          Abrir diálogo
        </Button>
        <Button variante="destructive" onClick={() => setConfirmar(true)}>
          Confirmação destrutiva
        </Button>
        <Button variante="secondary" onClick={() => setPainel(true)}>
          Abrir painel lateral
        </Button>
      </div>
      <Dialog
        aberto={dialogo}
        titulo="Editar protocolo"
        descricao="Altere o protocolo da proposta."
        onFechar={() => setDialogo(false)}
        rodape={
          <>
            <Button variante="secondary" onClick={() => setDialogo(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setDialogo(false)}>Salvar</Button>
          </>
        }
      >
        <TextField rotulo="Protocolo" defaultValue="ENSAIO-PROT-001" />
      </Dialog>
      <ConfirmDialog
        aberto={confirmar}
        titulo="Desativar conta?"
        mensagem="A pessoa perde o acesso ao app na hora. Dá para reativar depois."
        rotuloConfirmar="Desativar"
        onConfirmar={() => setConfirmar(false)}
        onCancelar={() => setConfirmar(false)}
      />
      <Drawer aberto={painel} titulo="Gerenciar usuário" descricao="maria.souza@goias.gov.br" onFechar={() => setPainel(false)}>
        <div className="space-y-4">
          <Switch rotulo="Níveis da D1" ligado onMudar={() => {}} />
          <Switch rotulo="Homologar proposta" ligado={false} onMudar={() => {}} />
        </div>
      </Drawer>
      <Grupo titulo="Abas">
        <Tabs
          rotulo="Etapas da avaliação (exemplo)"
          abas={[
            { id: 'adm', rotulo: 'Admissibilidade', conteudo: <p className="text-body-md">Checklist do item 28.1.</p> },
            { id: 'd1', rotulo: 'Dimensão 1', conteudo: <p className="text-body-md">28 subcritérios, nível de 0 a 4.</p> },
            { id: 'd2', rotulo: 'Dimensão 2', conteudo: <p className="text-body-md">Experiência da OSC.</p> },
          ]}
        />
      </Grupo>
      <Grupo titulo="Trilha de navegação">
        <Breadcrumb itens={[{ rotulo: 'Chamamentos', para: '/' }, { rotulo: 'ENSAIO-001/2026', para: '/' }, { rotulo: 'Classificação do lote L1' }]} />
      </Grupo>
    </Secao>
  )
}

interface PropostaExemplo {
  id: string
  osc: string
  lote: string
  nf: number
  status: StatusSelo
}

const PROPOSTAS: PropostaExemplo[] = [
  { id: '1', osc: 'Associação Beta', lote: 'L1', nf: 94, status: 'empatada' },
  { id: '2', osc: 'Centro Gama', lote: 'L1', nf: 94, status: 'empatada' },
  { id: '3', osc: 'Instituto Alfa', lote: 'L1', nf: 114.75, status: 'pendente' },
  { id: '4', osc: 'Obra Épsilon', lote: 'L2', nf: 60, status: 'inapta' },
  { id: '5', osc: 'Fundação Delta', lote: 'L2', nf: 0, status: 'desclassificada' },
  { id: '6', osc: 'Grupo Zeta', lote: 'L2', nf: 0, status: 'nao_admitida' },
  { id: '7', osc: 'Casa Ômega', lote: 'L1', nf: 101.5, status: 'apta' },
  { id: '8', osc: 'Rede Sigma', lote: 'L2', nf: 99, status: 'homologada' },
]

const COLUNAS: ColunaTabela<PropostaExemplo>[] = [
  { id: 'osc', titulo: 'OSC', celula: (p) => p.osc, ordenar: (p) => p.osc },
  { id: 'lote', titulo: 'Lote', celula: (p) => p.lote, ordenar: (p) => p.lote },
  { id: 'nf', titulo: 'NF', celula: (p) => p.nf.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), ordenar: (p) => p.nf, alinhar: 'direita' },
  { id: 'status', titulo: 'Status', celula: (p) => <StatusBadge status={p.status} /> },
]

function Tabelas() {
  return (
    <Secao titulo="Tabela de dados" descricao="Ordenação, busca, filtro, paginação, ações por linha, densidade; setas movem entre as linhas.">
      <DataTable
        rotulo="Propostas de exemplo"
        colunas={COLUNAS}
        linhas={PROPOSTAS}
        chave={(p) => p.id}
        porPagina={5}
        busca={{ rotulo: 'Buscar OSC', texto: (p) => p.osc }}
        filtros={[{ id: 'lote', rotulo: 'Lote', opcoes: [{ valor: 'L1', rotulo: 'L1' }, { valor: 'L2', rotulo: 'L2' }], aplicar: (p, v) => p.lote === v }]}
        acoes={(p) => (
          <Button variante="tertiary" tamanho="sm" icone={Download} aria-label={`Baixar espelho de ${p.osc}`}>
            Espelho
          </Button>
        )}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <DataTable rotulo="Tabela carregando" colunas={COLUNAS} linhas={[]} chave={(p) => p.id} carregando />
        <DataTable rotulo="Tabela vazia" colunas={COLUNAS} linhas={[]} chave={(p) => p.id} vazio={{ titulo: 'Nenhuma proposta', descricao: 'Ajuste a busca ou os filtros.' }} />
        <DataTable rotulo="Tabela com erro" colunas={COLUNAS} linhas={[]} chave={(p) => p.id} erro="Sem conexão com o servidor." onTentarNovamente={() => {}} />
      </div>
    </Secao>
  )
}

function Icones() {
  return (
    <Secao titulo="Ícones" descricao="Uma biblioteca (lucide-react), tamanhos 16/20/24 e traço 1,75.">
      <div className="flex items-end gap-6 text-text-primary">
        {([16, 20, 24] as const).map((t) => (
          <span key={t} className="flex flex-col items-center gap-1">
            <Icone icone={Search} tamanho={t} rotulo={`Buscar, ${t} px`} />
            <span className="text-caption text-text-muted">{t} px</span>
          </span>
        ))}
      </div>
    </Secao>
  )
}

export function TelaCatalogo() {
  return (
    <ToastProvider>
      <div className="mx-auto max-w-[1440px] space-y-8">
        <header>
          <h1 className="text-heading-1 text-text-primary">Catálogo de componentes</h1>
          <p className="mt-1 text-body-md text-text-secondary">
            Biblioteca src/components/ui — Sistema de Design SEDS 1.0. Só tokens semânticos; nenhuma cor HEX.
          </p>
        </header>
        <Botoes />
        <Campos />
        <FormularioExemplo />
        <Feedback />
        <OverlaysENavegacao />
        <Tabelas />
        <Icones />
      </div>
    </ToastProvider>
  )
}
