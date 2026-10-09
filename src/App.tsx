import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Shell } from './componentes/Shell'
import type { Perfil } from './domain/perfis'
import { PERMISSOES } from './domain/permissoes'
import { TelaAdmissibilidade } from './features/admissibilidade/TelaAdmissibilidade'
import { Login } from './features/auth/Login'
import { TelaD1 } from './features/avaliacao/TelaD1'
import { RotaProtegida } from './features/auth/RotaProtegida'
import { UsuarioProvider } from './features/auth/useUsuario'
import { FormChamamento } from './features/chamamentos/FormChamamento'
import { FormProposta } from './features/chamamentos/FormProposta'
import { Inicio } from './features/chamamentos/ListaChamamentos'
import { PainelChamamento } from './features/chamamentos/PainelChamamento'
import { TelaD2 } from './features/experiencias/TelaD2'
import { TelaMemoriaD2 } from './features/experiencias/TelaMemoriaD2'
import { TelaOscs } from './features/oscs/TelaOscs'
import { TelaPerfis } from './features/perfis/TelaPerfis'
import { ConduzirSessao } from './features/sessoes/ConduzirSessao'
import { NovaSessao } from './features/sessoes/NovaSessao'

/** Quem lê chamamentos e o que há abaixo deles (firestore.rules); controle só lê. */
const LEITURA: readonly Perfil[] = ['admin', 'presidente', 'relator', 'membro', 'controle']

const so = (perfis: readonly Perfil[], tela: ReactNode) => <RotaProtegida perfis={perfis}>{tela}</RotaProtegida>

export default function App() {
  return (
    <UsuarioProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RotaProtegida>
                <Shell />
              </RotaProtegida>
            }
          >
            <Route index element={<Inicio />} />
            <Route path="chamamentos/novo" element={so(PERMISSOES.cadastros, <FormChamamento />)} />
            <Route path="chamamentos/:ch" element={so(LEITURA, <PainelChamamento />)} />
            <Route path="chamamentos/:ch/editar" element={so(PERMISSOES.cadastros, <FormChamamento />)} />
            <Route path="chamamentos/:ch/propostas/nova" element={so(PERMISSOES.cadastros, <FormProposta />)} />
            <Route path="chamamentos/:ch/propostas/:p/editar" element={so(PERMISSOES.cadastros, <FormProposta />)} />
            <Route path="chamamentos/:ch/sessoes/nova" element={so(PERMISSOES.sessaoAbrirEncerrar, <NovaSessao />)} />
            <Route path="chamamentos/:ch/sessoes/:s" element={so(LEITURA, <ConduzirSessao />)} />
            <Route path="chamamentos/:ch/propostas/:p/admissibilidade" element={so(LEITURA, <TelaAdmissibilidade />)} />
            <Route path="chamamentos/:ch/propostas/:p/d1" element={so(LEITURA, <TelaD1 />)} />
            <Route path="chamamentos/:ch/propostas/:p/d2" element={so(LEITURA, <TelaD2 />)} />
            <Route path="chamamentos/:ch/propostas/:p/d2/memoria" element={so(LEITURA, <TelaMemoriaD2 />)} />
            <Route path="oscs" element={so(PERMISSOES.cadastros, <TelaOscs />)} />
            <Route path="perfis" element={so(PERMISSOES.perfis, <TelaPerfis />)} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </UsuarioProvider>
  )
}
