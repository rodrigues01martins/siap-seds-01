// Cadastro e edição de proposta (admin): OSC, lote, protocolo e nº SEI — POST/PATCH /api/propostas.

import type { FieldValues } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { EstadoLeitura, Titulo } from '../../componentes/basicos'
import { Campo, CampoSelecao, Formulario } from '../../componentes/Formulario'
import { formatarCnpj } from '../../domain/cnpj'
import { esquemaCriarProposta } from '../../esquemas/cadastros'
import { chamarApi } from '../../lib/api'
import { useColecao, useDocumento } from '../../lib/firestore'
import type { Chamamento, Osc, Proposta } from '../../lib/tipos'

const VAZIO = { oscCnpj: '', loteCodigo: '', protocolo: '', numeroSEI: '', observacao: '' }

export function FormProposta() {
  const { ch, p } = useParams()
  const navegar = useNavigate()
  const chamamento = useDocumento<Chamamento>(`chamamentos/${ch}`)
  const oscs = useColecao<Osc>('oscs')
  const proposta = useDocumento<Proposta>(p ? `chamamentos/${ch}/propostas/${p}` : null)

  const carregando = chamamento.carregando || oscs.carregando || (p !== undefined && proposta.carregando)
  const erro = chamamento.erro ?? oscs.erro ?? proposta.erro
  if (carregando || erro) return <EstadoLeitura carregando={carregando} erro={erro} />
  if (!chamamento.dados) return <p className="text-slate-600">Chamamento não encontrado.</p>
  if (p && !proposta.dados) return <p className="text-slate-600">Proposta não encontrada.</p>

  const atual = proposta.dados as Record<string, unknown> | null
  const iniciais = Object.fromEntries(Object.entries(VAZIO).map(([campo, vazio]) => [campo, atual?.[campo] ?? vazio]))
  const opcoesOsc = [...oscs.dados]
    .sort((a, b) => a.razaoSocial.localeCompare(b.razaoSocial))
    .map((o) => ({ valor: o.cnpj, rotulo: `${o.razaoSocial} — ${formatarCnpj(o.cnpj)}` }))

  return (
    <>
      <Titulo>
        {p ? 'Editar proposta' : 'Nova proposta'} — Chamamento {chamamento.dados.numero}
      </Titulo>
      <div className="max-w-2xl rounded-lg border border-slate-200 bg-white p-6">
        <Formulario
          esquema={esquemaCriarProposta}
          valoresIniciais={iniciais}
          transformar={(valores: FieldValues) => ({ ...valores, chamamentoId: ch })}
          rotuloEnviar={p ? 'Salvar alterações' : 'Cadastrar proposta'}
          onEnviar={async (dados) => {
            if (p) await chamarApi('/api/propostas', { metodo: 'PATCH', corpo: { ...dados, propostaId: p } })
            else await chamarApi('/api/propostas', { metodo: 'POST', corpo: dados })
            navegar(`/chamamentos/${ch}`)
          }}
        >
          <CampoSelecao nome="oscCnpj" rotulo="OSC" opcoes={opcoesOsc} vazio="Selecione a OSC…" />
          {opcoesOsc.length === 0 && (
            <p className="text-sm text-amber-800">Nenhuma OSC cadastrada: cadastre a OSC antes da proposta.</p>
          )}
          <CampoSelecao
            nome="loteCodigo"
            rotulo="Lote"
            opcoes={chamamento.dados.lotes.map((l) => ({ valor: l.codigo, rotulo: `${l.codigo} — ${l.descricao}` }))}
            vazio="Selecione o lote…"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="protocolo" rotulo="Protocolo" />
            <Campo nome="numeroSEI" rotulo="Nº do documento SEI" />
          </div>
          <Campo nome="observacao" rotulo="Observação" tipo="textarea" />
        </Formulario>
      </div>
    </>
  )
}
