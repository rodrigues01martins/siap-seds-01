// Tabela reutilizável: colunas declaradas com uma função de célula.

import type { ReactNode } from 'react'

export interface Coluna<T> {
  titulo: string
  celula: (linha: T) => ReactNode
  classe?: string
}

interface Props<T> {
  rotulo: string
  colunas: Coluna<T>[]
  linhas: T[]
  chave: (linha: T) => string
  vazio?: string
}

export function Tabela<T>({ rotulo, colunas, linhas, chave, vazio = 'Nenhum registro.' }: Props<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table aria-label={rotulo} className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            {colunas.map((c) => (
              <th key={c.titulo} scope="col" className={`px-3 py-2 font-medium ${c.classe ?? ''}`}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.length === 0 ? (
            <tr>
              <td colSpan={colunas.length} className="px-3 py-4 text-slate-500">
                {vazio}
              </td>
            </tr>
          ) : (
            linhas.map((linha) => (
              <tr key={chave(linha)} className="border-t border-slate-100">
                {colunas.map((c) => (
                  <td key={c.titulo} className={`px-3 py-2 ${c.classe ?? ''}`}>
                    {c.celula(linha)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
