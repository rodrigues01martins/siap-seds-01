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
    <main className="mx-auto mt-24 max-w-lg rounded-card border-l-4 border-status-error bg-status-error-surface p-8 text-text-primary">
      <h1 className="text-heading-3 text-status-error-text">Aplicação sem configuração do Firebase</h1>
      <p className="mt-3 text-body-md">{erro.message}</p>
    </main>,
  )
}
