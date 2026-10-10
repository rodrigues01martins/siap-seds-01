// Botões que geram documentos no navegador: espelho da proposta (PDF) e quadro-resumo do lote (PDF/XLSX).

import { FileDown, FileSpreadsheet } from 'lucide-react'
import { AlertaErroApi } from '../../components/ui/AlertaErroApi'
import { Button } from '../../components/ui/Button'
import { TIPO_XLSX, baixarArquivo, nomeDeArquivo } from '../../lib/arquivo'
import { precisaMinuta } from '../../relatorios/documento'
import { dadosVerificadosEspelho, montarEspelho } from '../../relatorios/espelho'
import { montarQuadro, quadroPdf, type CabecalhoQuadro, type DecisaoComJustificativa, type PropostaQuadro } from '../../relatorios/quadroResumo'
import { carregarEspelho } from './carregar'
import { useGeracao } from './useGeracao'

export function BotaoEspelho({ ch, p }: { ch: string; p: string }) {
  const { gerando, erro, gerar, rodape } = useGeracao()
  return (
    <>
      <Button
        variante="secondary"
        icone={FileDown}
        carregando={gerando !== null}
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
      </Button>
      <AlertaErroApi erro={erro} />
    </>
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
      <Button
        variante="secondary"
        icone={FileDown}
        carregando={gerando === 'pdf'}
        desabilitado={gerando === 'xlsx'}
        onClick={() =>
          gerar('pdf', async () => {
            const { baixarPdf } = await import('../../relatorios/pdf')
            const definicao = quadroPdf(cabecalho, montarQuadro(ordenadas, decisoes), await rodape(dadosUsados()), minuta)
            await baixarPdf(definicao, `${nome}.pdf`)
          })
        }
      >
        {gerando === 'pdf' ? 'Gerando…' : 'Quadro-resumo (PDF)'}
      </Button>
      <Button
        variante="secondary"
        icone={FileSpreadsheet}
        carregando={gerando === 'xlsx'}
        desabilitado={gerando === 'pdf'}
        onClick={() =>
          gerar('xlsx', async () => {
            const { quadroXlsx } = await import('../../relatorios/xlsx')
            const arquivo = await quadroXlsx(cabecalho, montarQuadro(ordenadas, decisoes), await rodape(dadosUsados()), minuta)
            baixarArquivo(arquivo, `${nome}.xlsx`, TIPO_XLSX)
          })
        }
      >
        {gerando === 'xlsx' ? 'Gerando…' : 'Quadro-resumo (XLSX)'}
      </Button>
      <AlertaErroApi erro={erro} />
    </>
  )
}
