// /oscs (admin): lista de OSCs e cadastro/edição com CNPJ mascarado e validado (numérico ou alfanumérico).

import { useState } from 'react'
import { Botao, EstadoLeitura, Secao, Titulo } from '../../componentes/basicos'
import { Campo, Formulario } from '../../componentes/Formulario'
import { Tabela } from '../../componentes/Tabela'
import { formatarCnpj, mascararCnpj } from '../../domain/cnpj'
import { esquemaCriarOsc } from '../../esquemas/cadastros'
import { chamarApi } from '../../lib/api'
import { useColecao, type ComId } from '../../lib/firestore'
import type { Osc } from '../../lib/tipos'

export function TelaOscs() {
  const oscs = useColecao<Osc>('oscs')
  const [editando, setEditando] = useState<ComId<Osc> | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const linhas = [...oscs.dados].sort((a, b) => a.razaoSocial.localeCompare(b.razaoSocial))

  return (
    <>
      <Titulo>OSCs</Titulo>
      <div className="max-w-2xl rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-3 font-semibold">{editando ? `Editar ${editando.razaoSocial}` : 'Nova OSC'}</h2>
        <Formulario
          key={editando?.id ?? 'nova'}
          esquema={esquemaCriarOsc}
          valoresIniciais={{
            cnpj: editando ? formatarCnpj(editando.cnpj) : '',
            razaoSocial: editando?.razaoSocial ?? '',
            nomeFantasia: editando?.nomeFantasia ?? '',
          }}
          limparAoConcluir={!editando}
          rotuloEnviar={editando ? 'Salvar alterações' : 'Cadastrar OSC'}
          onEnviar={async (dados) => {
            setAviso(null)
            await chamarApi('/api/oscs', { metodo: editando ? 'PATCH' : 'POST', corpo: dados })
            setAviso(editando ? 'OSC atualizada.' : 'OSC cadastrada.')
            setEditando(null)
          }}
        >
          <Campo
            nome="cnpj"
            rotulo="CNPJ"
            mascara={mascararCnpj}
            somenteLeitura={editando !== null}
            ajuda="Numérico ou alfanumérico (IN RFB 2.229/2024)."
          />
          <Campo nome="razaoSocial" rotulo="Razão social" />
          <Campo nome="nomeFantasia" rotulo="Nome fantasia" />
        </Formulario>
        {editando && (
          <div className="mt-3">
            <Botao onClick={() => setEditando(null)}>Cancelar edição</Botao>
          </div>
        )}
        {aviso && (
          <p role="status" className="mt-3 text-sm text-emerald-800">
            {aviso}
          </p>
        )}
      </div>

      <Secao titulo="Cadastradas">
        <EstadoLeitura carregando={oscs.carregando} erro={oscs.erro} />
        {!oscs.carregando && !oscs.erro && (
          <Tabela
            rotulo="OSCs cadastradas"
            linhas={linhas}
            chave={(o) => o.id}
            vazio="Nenhuma OSC cadastrada."
            colunas={[
              { titulo: 'CNPJ', celula: (o) => formatarCnpj(o.cnpj) },
              { titulo: 'Razão social', celula: (o) => o.razaoSocial },
              { titulo: 'Nome fantasia', celula: (o) => o.nomeFantasia ?? '—' },
              { titulo: 'Ações', celula: (o) => <Botao onClick={() => setEditando(o)}>Editar</Botao> },
            ]}
          />
        )}
      </Secao>
    </>
  )
}
