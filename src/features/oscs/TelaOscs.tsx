// /oscs (ListPage): OSCs com busca e ordenação; "Nova OSC" e "Editar" abrem um painel lateral com o formulário
// (CNPJ mascarado e validado, numérico ou alfanumérico). POST/PATCH /api/oscs.
// "Excluir" no menu de ações da linha (DialogoExclusao; bloqueada se houver proposta vinculada).

import { Building2, SquarePen } from 'lucide-react'
import { useState } from 'react'
import { ListPage } from '../../components/templates/paginas'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { Drawer } from '../../components/ui/Drawer'
import { MenuAcoes } from '../../components/ui/MenuAcoes'
import { CampoTexto, FormularioApi } from '../../components/ui/FormularioApi'
import { useToast } from '../../components/ui/Toast'
import { formatarCnpj } from '../../domain/cnpj'
import { esquemaCriarOsc } from '../../esquemas/cadastros'
import { chamarApi } from '../../lib/api'
import { useColecao, type ComId } from '../../lib/firestore'
import type { Osc } from '../../lib/tipos'
import { emExclusao, SeloEmExclusao, useExclusao } from '../exclusao/useExclusao'

type Edicao = { tipo: 'nova' } | { tipo: 'editar'; osc: ComId<Osc> } | null

export function TelaOscs() {
  const oscs = useColecao<Osc>('oscs')
  const [edicao, setEdicao] = useState<Edicao>(null)
  const { mostrar } = useToast()
  const editando = edicao?.tipo === 'editar' ? edicao.osc : null
  const exclusao = useExclusao()

  return (
    <ListPage
      cabecalho={{
        trilha: [{ rotulo: 'Chamamentos', para: '/' }, { rotulo: 'OSCs' }],
        titulo: 'OSCs',
        descricao: 'Organizações da sociedade civil que apresentam propostas.',
        acaoPrimaria: (
          <Button icone={Building2} onClick={() => setEdicao({ tipo: 'nova' })}>
            Nova OSC
          </Button>
        ),
      }}
    >
      <DataTable<ComId<Osc>>
        rotulo="OSCs cadastradas"
        linhas={[...oscs.dados].sort((a, b) => a.razaoSocial.localeCompare(b.razaoSocial))}
        chave={(o) => o.id}
        carregando={oscs.carregando}
        erro={oscs.erro}
        busca={{ rotulo: 'Buscar por CNPJ ou nome', texto: (o) => `${o.cnpj} ${formatarCnpj(o.cnpj)} ${o.razaoSocial} ${o.nomeFantasia ?? ''}` }}
        vazio={{ titulo: 'Nenhuma OSC cadastrada', descricao: 'Use "Nova OSC" para cadastrar a primeira.' }}
        colunas={[
          { id: 'cnpj', titulo: 'CNPJ', celula: (o) => <span className="tabular-nums">{formatarCnpj(o.cnpj)}</span> },
          {
            id: 'razao',
            titulo: 'Razão social',
            celula: (o) => (
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{o.razaoSocial}</span>
                {emExclusao(o) && <SeloEmExclusao />}
              </span>
            ),
            ordenar: (o) => o.razaoSocial,
          },
          { id: 'fantasia', titulo: 'Nome fantasia', celula: (o) => o.nomeFantasia ?? '—', ordenar: (o) => o.nomeFantasia ?? '' },
        ]}
        acoes={(o) => (
          <span className="flex justify-end gap-1">
            <Button variante="tertiary" tamanho="sm" icone={SquarePen} aria-label={`Editar ${o.razaoSocial}`} onClick={() => setEdicao({ tipo: 'editar', osc: o })}>
              Editar
            </Button>
            <MenuAcoes
              rotulo={`Mais ações — ${o.razaoSocial}`}
              itens={[exclusao.itemExcluir({ tipo: 'osc', ids: { cnpj: o.cnpj }, identificador: formatarCnpj(o.cnpj), nome: `OSC ${o.razaoSocial}` })]}
            />
          </span>
        )}
      />
      {exclusao.dialogo}

      <Drawer
        aberto={edicao !== null}
        titulo={editando ? `Editar ${editando.razaoSocial}` : 'Nova OSC'}
        descricao="Campos com * são obrigatórios."
        onFechar={() => setEdicao(null)}
      >
        <FormularioApi
          key={editando?.id ?? 'nova'}
          rotulo={editando ? 'Editar OSC' : 'Nova OSC'}
          esquema={esquemaCriarOsc}
          valoresIniciais={{
            cnpj: editando ? formatarCnpj(editando.cnpj) : '',
            razaoSocial: editando?.razaoSocial ?? '',
            nomeFantasia: editando?.nomeFantasia ?? '',
          }}
          rotuloEnviar={editando ? 'Salvar alterações' : 'Cadastrar OSC'}
          acoesSecundarias={
            <Button variante="secondary" onClick={() => setEdicao(null)}>
              Cancelar
            </Button>
          }
          onEnviar={async (dados) => {
            await chamarApi('/api/oscs', { metodo: editando ? 'PATCH' : 'POST', corpo: dados })
            mostrar({ tom: 'success', titulo: editando ? 'OSC atualizada' : 'OSC cadastrada', mensagem: dados.razaoSocial })
            setEdicao(null)
          }}
        >
          <div className="space-y-4">
            <CampoTexto nome="cnpj" rotulo="CNPJ" tipo="cnpj" obrigatorio somenteLeitura={editando !== null} ajuda="Numérico ou alfanumérico (IN RFB 2.229/2024)." />
            <CampoTexto nome="razaoSocial" rotulo="Razão social" obrigatorio />
            <CampoTexto nome="nomeFantasia" rotulo="Nome fantasia" />
          </div>
        </FormularioApi>
      </Drawer>
    </ListPage>
  )
}
