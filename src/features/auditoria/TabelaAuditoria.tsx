// Trilha de auditoria (somente leitura): filtros e tabela com o antes/depois de cada registro.

import { Fragment, useState } from 'react'
import { ACOES_AUDITORIA, descreverCaminho, diferencas, type FiltrosAuditoria as Filtros, type RegistroAuditoria } from '../../relatorios/auditoria'
import { formatarDataHora } from '../../relatorios/documento'

const classeCampo = 'mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm'

export function FiltrosAuditoria({ inicial, onAplicar }: { inicial: Filtros; onAplicar: (filtros: Filtros) => void }) {
  const [f, setF] = useState<Filtros>({ proposta: '', usuario: '', acao: '', de: '', ate: '', ...inicial })
  const campo = (nome: keyof Filtros) => ({
    id: `filtro-${nome}`,
    value: f[nome] ?? '',
    onChange: (e: { target: { value: string } }) => setF((atual) => ({ ...atual, [nome]: e.target.value })),
    className: classeCampo,
  })
  return (
    <form
      aria-label="Filtros da auditoria"
      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-6"
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
      <div className="text-sm font-medium">
        <label htmlFor="filtro-proposta">Proposta</label>
        <input type="text" placeholder="id da proposta" {...campo('proposta')} />
      </div>
      <div className="text-sm font-medium sm:col-span-2">
        <label htmlFor="filtro-usuario">Usuário (e-mail ou uid)</label>
        <input type="text" {...campo('usuario')} />
      </div>
      <div className="text-sm font-medium">
        <label htmlFor="filtro-acao">Ação</label>
        <select {...campo('acao')}>
          <option value="">Todas</option>
          {ACOES_AUDITORIA.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div className="text-sm font-medium">
        <label htmlFor="filtro-de">De</label>
        <input type="date" {...campo('de')} />
      </div>
      <div className="text-sm font-medium">
        <label htmlFor="filtro-ate">Até</label>
        <input type="date" {...campo('ate')} />
      </div>
      <div className="sm:col-span-6">
        <button type="submit" className="rounded-md bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-800">
          Filtrar
        </button>
      </div>
    </form>
  )
}

function AntesDepois({ registro }: { registro: RegistroAuditoria }) {
  const linhas = diferencas(registro.antes, registro.depois)
  if (linhas.length === 0) return <p className="text-sm text-slate-600">Nenhum campo alterado (só marcas de tempo).</p>
  return (
    <table aria-label={`Antes e depois — ${descreverCaminho(registro.caminho)}`} className="w-full text-left text-xs">
      <thead className="text-slate-600">
        <tr>
          <th scope="col" className="px-2 py-1">Campo</th>
          <th scope="col" className="px-2 py-1">Antes</th>
          <th scope="col" className="px-2 py-1">Depois</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.campo} className="border-t border-slate-200 align-top">
            <td className="px-2 py-1 font-medium">{l.campo}</td>
            <td className="px-2 py-1 font-mono break-all text-red-800">{l.antes}</td>
            <td className="px-2 py-1 font-mono break-all text-emerald-800">{l.depois}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function TabelaAuditoria({ registros }: { registros: RegistroAuditoria[] }) {
  const [aberto, setAberto] = useState<string | null>(null)
  if (registros.length === 0) return <p className="text-slate-600">Nenhum registro para os filtros escolhidos.</p>
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table aria-label="Trilha de auditoria" className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            {['Data/hora', 'Usuário', 'Perfil', 'Ação', 'Objeto', ''].map((t) => (
              <th key={t} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">
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
                <tr aria-label={`${quem} — ${r.acao} — ${objeto}`} className="border-t border-slate-100 align-top">
                  <td className="whitespace-nowrap px-3 py-2">{r.dataHora ? formatarDataHora(r.dataHora) : '—'}</td>
                  <td className="px-3 py-2">{quem}</td>
                  <td className="px-3 py-2">{r.perfil}</td>
                  <td className="px-3 py-2">{r.acao}</td>
                  <td className="px-3 py-2">
                    <span>{objeto}</span>
                    <span className="block font-mono text-xs text-slate-500">{r.caminho}</span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      aria-expanded={aberto === r.id}
                      onClick={() => setAberto(aberto === r.id ? null : r.id)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium hover:bg-slate-50"
                    >
                      Ver antes/depois
                    </button>
                  </td>
                </tr>
                {aberto === r.id && (
                  <tr className="bg-slate-50">
                    <td colSpan={6} className="px-3 py-2">
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
