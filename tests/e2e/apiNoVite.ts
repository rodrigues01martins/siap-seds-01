// Só para os testes de navegador: monta as funções de /api (formato Vercel: um export por método, com
// Request/Response da Web) como middleware do servidor do Vite, para o fluxo completo gravar de verdade nos
// emuladores. Não entra no build nem na Vercel (usado apenas por vite.e2e.config.ts).

import type { IncomingMessage } from 'node:http'
import type { Plugin } from 'vite'

type Rota = Record<string, ((requisicao: Request) => Promise<Response>) | undefined>

async function lerCorpo(req: IncomingMessage): Promise<Buffer> {
  const partes: Buffer[] = []
  for await (const parte of req) partes.push(parte as Buffer)
  return Buffer.concat(partes)
}

export function apiNoVite(): Plugin {
  return {
    name: 'siap-api-no-vite-e2e',
    apply: 'serve',
    configureServer(servidor) {
      servidor.middlewares.use(async (req, res, proximo) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const rota = /^\/api\/([a-z]+)$/.exec(url.pathname)?.[1]
        if (!rota) return proximo()
        try {
          const modulo = (await servidor.ssrLoadModule(`/api/${rota}.ts`)) as Rota
          const metodo = req.method ?? 'GET'
          const cabecalhos = new Headers()
          for (const [nome, valor] of Object.entries(req.headers)) {
            if (valor !== undefined) cabecalhos.set(nome, Array.isArray(valor) ? valor.join(', ') : valor)
          }
          const corpo = metodo === 'GET' || metodo === 'HEAD' ? undefined : await lerCorpo(req)
          const tratador = modulo[metodo]
          if (!tratador) {
            res.statusCode = 405
            return res.end()
          }
          const resposta = await tratador(new Request(url, { method: metodo, headers: cabecalhos, body: corpo }))
          res.statusCode = resposta.status
          resposta.headers.forEach((valor, nome) => res.setHeader(nome, valor))
          res.end(Buffer.from(await resposta.arrayBuffer()))
        } catch (erro) {
          proximo(erro)
        }
      })
    },
  }
}
