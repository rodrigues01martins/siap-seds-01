// Trilha de auditoria (somente leitura): filtros e tabela com o antes/depois de cada registro.

import { ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { Fragment, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { DatePicker } from '../../components/ui/DatePicker'
import { EmptyState } from '../../components/ui/EmptyState'
import { Select } from '../../components/ui/Select'
import { TextField } from '../../components/ui/TextField'
import { ACOES_AUDITORIA, descreverCaminho, diferencas, type FiltrosAuditoria as Filtros, type RegistroAuditoria } from '../../relatorios/auditoria'
import { formatarDataHora } from '../../relatorios/documento'

export function FiltrosAuditoria({ inicial, onAplicar }: { inicial: Filtros; onAplicar: (filtros: Filtros) => void }) {
  const [f, setF] = useState<Filtros>({ proposta: '', usuario: '', acao: '', de: '', ate: '', ...inicial })
  const campo = (nome: keyof Filtros) => ({
    value: f[nome] ?? '',
    onChange: (e: { target: { value: string } }) => setF((atual) => ({ ...atual, [nome]: e.target.value })),
  })
  return (
    <form
      aria-label="Filtros da auditoria"
      className="grid gap-4 rounded-card border border-card-border bg-card-bg p-(--sds-card-padding) sm:grid-cols-2 lg:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault()
        onAplicar({
          proposta: f.proposta?.trim() ?? '',
          usuario: f.usuario?.trim() ?? '',
          acao: f.acao ?? '',
          de: f.de ?? '',
          ate: f.ate ?? '',
        })
      }}
    >
      <TextField rotulo="Proposta" placeholder="id da proposta" {...campo('proposta')} />
      <TextField rotulo="Usuário (e-mail ou uid)" className="lg:col-span-2" {...campo('usuario')} />
      <Select rotulo="Ação" vazio="Todas" opcoes={ACOES_AUDITORIA.map((a) => ({ valor: a, rotulo: a }))} {...campo('acao')} />
      <DatePicker rotulo="De" {...campo('de')} />
      <DatePicker rotulo="Até" {...campo('ate')} />
      <div className="sm:col-span-2 lg:col-span-6">
        <Button type="submit" icone={Filter}>
          Filtrar
        </Button>
      </div>
    </form>
  )
}

function AntesDepois({ registro }: { registro: RegistroAuditoria }) {
  const linhas = diferencas(registro.antes, registro.depois)
  if (linhas.length === 0) return <p className="text-body-sm text-text-secondary">Nenhum campo alterado (só marcas de tempo).</p>
  return (
    <table aria-label={`Antes e depois — ${descreverCaminho(registro.caminho)}`} className="w-full text-left text-body-sm">
      <thead className="text-table-header-fg">
        <tr>
          <th scope="col" className="px-2 py-1 text-label-md">Campo</th>
          <th scope="col" className="px-2 py-1 text-label-md">Antes</th>
          <th scope="col" className="px-2 py-1 text-label-md">Depois</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.campo} className="border-t border-table-border align-top">
            <td className="px-2 py-1 font-semibold">{l.campo}</td>
            <td className="px-2 py-1 font-mono break-all text-status-error-text">{l.antes}</td>
            <td className="px-2 py-1 font-mono break-all text-status-success-text">{l.depois}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function TabelaAuditoria({ registros }: { registros: RegistroAuditoria[] }) {
  const [aberto, setAberto] = useState<string | null>(null)
  if (registros.length === 0) {
    return (
      <div className="rounded-card border border-card-border bg-card-bg">
        <EmptyState titulo="Nenhum registro para os filtros escolhidos." descricao="Amplie o período ou limpe os filtros." />
      </div>
    )
  }
  return (
    <div className="overflow-x-auto rounded-card border border-table-border bg-background-surface">
      <table aria-label="Trilha de auditoria" className="w-full text-left text-body-sm">
        <thead className="bg-table-header-bg text-table-header-fg">
          <tr>
            {['Data/hora', 'Usuário', 'Perfil', 'Ação', 'Objeto', 'Detalhe'].map((t) => (
              <th key={t} scope="col" className="h-(--sds-table-header-height) px-4 text-label-md whitespace-nowrap">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {registros.map((r) => {
            const objeto = descreverCaminho(r.caminho)
            const quem = r.email ?? r.uid
            return (
              <Fragment key={r.id}>
                <tr aria-label={`${quem} — ${r.acao} — ${objeto}`} className="border-t border-table-border align-top hover:bg-table-row-bg-hover">
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums">{r.dataHora ? formatarDataHora(r.dataHora) : '—'}</td>
                  <td className="px-4 py-3">{quem}</td>
                  <td className="px-4 py-3">{r.perfil}</td>
                  <td className="px-4 py-3">{r.acao}</td>
                  <td className="px-4 py-3">
                    <span>{objeto}</span>
                    <span className="block font-mono text-caption text-text-muted">{r.caminho}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variante="tertiary"
                      tamanho="sm"
                      icone={aberto === r.id ? ChevronUp : ChevronDown}
                      aria-expanded={aberto === r.id}
                      onClick={() => setAberto(aberto === r.id ? null : r.id)}
                    >
                      Ver antes/depois
                    </Button>
                  </td>
                </tr>
                {aberto === r.id && (
                  <tr className="bg-background-default">
                    <td colSpan={6} className="px-4 py-3">
                      <AntesDepois registro={r} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
