// /chamamentos/:ch/sessoes/:s/ata — minuta de ata da sessão: texto gerado dos registros, editável,
// exportado em PDF com o rodapé de verificação (dados usados + texto final) e "MINUTA" se houver
// proposta da pauta não homologada.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AlertaErro } from '../../componentes/AlertaErro'
import { EstadoLeitura, Titulo, dataBr } from '../../componentes/basicos'
import { nomeDeArquivo } from '../../lib/arquivo'
import { dadosVerificadosAta, montarAtaPdf, textoInicialAta, type DadosAta } from '../../relatorios/ata'
import { precisaMinuta } from '../../relatorios/documento'
import { carregarAta } from './carregar'
import { EditorAta } from './EditorAta'
import { useGeracao } from './useGeracao'

export function TelaAta() {
  const { ch = '', s = '' } = useParams()
  const [leitura, setLeitura] = useState<{ dados: DadosAta | null; carregando: boolean; erro: string | null }>({
    dados: null,
    carregando: true,
    erro: null,
  })
  const { gerando, erro, gerar, rodape } = useGeracao()

  useEffect(() => {
    let ativo = true
    carregarAta(ch, s).then(
      (dados) => ativo && setLeitura({ dados, carregando: false, erro: null }),
      () => ativo && setLeitura({ dados: null, carregando: false, erro: 'Não foi possível carregar os dados da sessão.' }),
    )
    return () => {
      ativo = false
    }
  }, [ch, s])

  if (leitura.carregando || leitura.erro) return <EstadoLeitura carregando={leitura.carregando} erro={leitura.erro} />
  if (!leitura.dados) return <p className="text-slate-600">Sessão não encontrada.</p>
  const dados = leitura.dados
  const minuta = precisaMinuta(dados.propostas)

  return (
    <>
      <Titulo>Minuta de ata — sessão de {dataBr(dados.sessao.data)}</Titulo>
      <p className="mb-4 text-sm text-slate-600">
        <Link to={`/chamamentos/${ch}/sessoes/${s}`} className="underline">
          Voltar à sessão
        </Link>{' '}
        · Texto gerado dos registros lidos ao abrir esta página. Recarregue a página para gerar de novo com dados atualizados.
      </p>
      <AlertaErro erro={erro} />
      <EditorAta
        textoInicial={textoInicialAta(dados)}
        minuta={minuta}
        exportando={gerando !== null}
        onExportar={(texto) =>
          gerar('ata', async () => {
            const { baixarPdf } = await import('../../relatorios/pdf')
            const definicao = montarAtaPdf(texto, await rodape(dadosVerificadosAta(dados, texto)), minuta)
            await baixarPdf(definicao, `${nomeDeArquivo('ata', dados.sessao.data)}.pdf`)
          })
        }
      />
    </>
  )
}
