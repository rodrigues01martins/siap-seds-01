// Início: lista de chamamentos (Comissão e admin). Controle não lê chamamentos (firestore.rules).

import { Link } from 'react-router'
import { EstadoLeitura, LinkBotao, Titulo, dataBr } from '../../componentes/basicos'
import { Tabela } from '../../componentes/Tabela'
import { useColecao } from '../../lib/firestore'
import type { Chamamento } from '../../lib/tipos'
import { useUsuario } from '../auth/useUsuario'

export function Inicio() {
  const { usuario } = useUsuario()
  if (usuario?.perfil === 'controle') {
    return (
      <>
        <Titulo>Controle</Titulo>
        <p className="text-slate-600">
          O perfil controle consulta a trilha de auditoria. Essa tela chega numa próxima etapa.
        </p>
      </>
    )
  }
  return <ListaChamamentos />
}

function ListaChamamentos() {
  const { usuario } = useUsuario()
  const leitura = useColecao<Chamamento>('chamamentos')
  const linhas = [...leitura.dados].sort((a, b) => a.numero.localeCompare(b.numero))

  return (
    <>
      <Titulo acoes={usuario?.perfil === 'admin' && <LinkBotao para="/chamamentos/novo" primario>Novo chamamento</LinkBotao>}>
        Chamamentos
      </Titulo>
      <EstadoLeitura carregando={leitura.carregando} erro={leitura.erro} />
      {!leitura.carregando && !leitura.erro && (
        <Tabela
          rotulo="Chamamentos"
          linhas={linhas}
          chave={(c) => c.id}
          vazio="Nenhum chamamento cadastrado."
          colunas={[
            { titulo: 'Nº', celula: (c) => c.numero },
            {
              titulo: 'Título',
              celula: (c) => (
                <Link to={`/chamamentos/${c.id}`} className="font-medium text-sky-800 underline">
                  {c.titulo}
                </Link>
              ),
            },
            { titulo: 'Processo SEI', celula: (c) => c.processoSei ?? '—' },
            { titulo: 'Data limite', celula: (c) => dataBr(c.dataLimitePropostas) },
            { titulo: 'Lotes', celula: (c) => c.lotes?.length ?? 0 },
          ]}
        />
      )}
    </>
  )
}
