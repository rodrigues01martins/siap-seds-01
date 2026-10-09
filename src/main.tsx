import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErroConfiguracao } from './lib/configFirebase'
import { iniciarFirebase } from './lib/firebase'
import './index.css'

const raiz = createRoot(document.getElementById('root')!)

try {
  iniciarFirebase()
  raiz.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (erro) {
  if (!(erro instanceof ErroConfiguracao)) throw erro
  console.error(erro.message)
  raiz.render(
    <main className="mx-auto mt-24 max-w-lg rounded-lg border border-red-200 bg-red-50 p-8 text-red-900">
      <h1 className="text-xl font-semibold">Aplicação sem configuração do Firebase</h1>
      <p className="mt-3">{erro.message}</p>
    </main>,
  )
}
