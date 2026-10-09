// Botões que geram documentos no navegador: espelho da proposta (PDF) e quadro-resumo do lote (PDF/XLSX).

import { AlertaErro } from '../../componentes/AlertaErro'
import { TIPO_XLSX, baixarArquivo, nomeDeArquivo } from '../../lib/arquivo'
import { precisaMinuta } from '../../relatorios/documento'
import { dadosVerificadosEspelho, montarEspelho } from '../../relatorios/espelho'
import { montarQuadro, quadroPdf, type CabecalhoQuadro, type DecisaoComJustificativa, type PropostaQuadro } from '../../relatorios/quadroResumo'
import { carregarEspelho } from './carregar'
import { useGeracao } from './useGeracao'

const classe = 'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50'

export function BotaoEspelho({ ch, p }: { ch: string; p: string }) {
  const { gerando, erro, gerar, rodape } = useGeracao()
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        className={classe}
        disabled={gerando !== null}
        onClick={() =>
          gerar('espelho', async () => {
            const dados = await carregarEspelho(ch, p)
            if (!dados) throw new Error('Proposta não encontrada.')
            const { baixarPdf } = await import('../../relatorios/pdf')
            const definicao = montarEspelho(dados, await rodape(dadosVerificadosEspelho(dados)))
            await baixarPdf(definicao, `${nomeDeArquivo('espelho', dados.osc.razaoSocial, dados.proposta.id)}.pdf`)
          })
        }
      >
        {gerando ? 'Gerando…' : 'Espelho (PDF)'}
      </button>
      <AlertaErro erro={erro} />
    </span>
  )
}

export function BotoesQuadro({
  cabecalho,
  propostas,
  decisoes,
}: {
  cabecalho: CabecalhoQuadro
  propostas: PropostaQuadro[]
  decisoes: DecisaoComJustificativa[]
}) {
  const { gerando, erro, gerar, rodape } = useGeracao()
  // Só os campos que a classificação usa, em ordem fixa: o código de verificação não varia com o resto.
  const ordenadas = propostas
    .map(({ id, nomeOsc, totais, bloqueada, admissibilidade }) => ({ id, nomeOsc, totais, bloqueada, admissibilidade }))
    .sort((a, b) => a.id.localeCompare(b.id))
  const dadosUsados = () => ({
    cabecalho,
    propostas: ordenadas,
    decisoes: decisoes.map(({ propostas: ids, nf, ordem, justificativa }) => ({ propostas: ids, nf, ordem, justificativa })),
  })
  const nome = nomeDeArquivo('quadro-resumo', cabecalho.chamamento.numero, 'lote', cabecalho.lote.codigo)
  const minuta = precisaMinuta(propostas)

  return (
    <>
      <button
        type="button"
        className={classe}
        disabled={gerando !== null}
        onClick={() =>
          gerar('pdf', async () => {
            const { baixarPdf } = await import('../../relatorios/pdf')
            const definicao = quadroPdf(cabecalho, montarQuadro(ordenadas, decisoes), await rodape(dadosUsados()), minuta)
            await baixarPdf(definicao, `${nome}.pdf`)
          })
        }
      >
        {gerando === 'pdf' ? 'Gerando…' : 'Quadro-resumo (PDF)'}
      </button>
      <button
        type="button"
        className={classe}
        disabled={gerando !== null}
        onClick={() =>
          gerar('xlsx', async () => {
            const { quadroXlsx } = await import('../../relatorios/xlsx')
            const arquivo = await quadroXlsx(cabecalho, montarQuadro(ordenadas, decisoes), await rodape(dadosUsados()), minuta)
            baixarArquivo(arquivo, `${nome}.xlsx`, TIPO_XLSX)
          })
        }
      >
        {gerando === 'xlsx' ? 'Gerando…' : 'Quadro-resumo (XLSX)'}
      </button>
      <AlertaErro erro={erro} />
    </>
  )
}
