// /chamamentos/:ch/sessoes/:s/ata — minuta de ata da sessão: texto gerado dos registros, editável,
// exportado em PDF com o rodapé de verificação (dados usados + texto final) e "MINUTA" se houver
// proposta da pauta não concluída.

import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { FormPage } from '../../components/templates/paginas'
import { AlertaErroApi } from '../../components/ui/AlertaErroApi'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Skeleton } from '../../components/ui/Skeleton'
import { dataBr } from '../../lib/datas'
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

  if (leitura.carregando) return <Skeleton linhas={8} rotulo="Carregando dados da sessão" />
  if (leitura.erro) return <ErrorState mensagem={leitura.erro} />
  if (!leitura.dados) return <EmptyState titulo="Sessão não encontrada" descricao="Confira o endereço ou volte ao painel do chamamento." />
  const dados = leitura.dados
  const minuta = precisaMinuta(dados.propostas)

  return (
    <FormPage
      cabecalho={{
        trilha: [
          { rotulo: 'Chamamentos', para: '/' },
          { rotulo: `Chamamento ${dados.chamamento.numero}`, para: `/chamamentos/${ch}` },
          { rotulo: `Sessão de ${dataBr(dados.sessao.data)}`, para: `/chamamentos/${ch}/sessoes/${s}` },
          { rotulo: 'Minuta de ata' },
        ],
        titulo: `Minuta de ata — sessão de ${dataBr(dados.sessao.data)}`,
        descricao: 'Texto gerado dos registros lidos ao abrir esta página. Recarregue a página para gerar de novo com dados atualizados.',
      }}
    >
      <AlertaErroApi erro={erro} />
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
    </FormPage>
  )
}
