import type { ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AppShell } from './components/templates/AppShell'
import { ToastProvider } from './components/ui/Toast'
import type { Exigencia } from './domain/permissoes'
import { TelaAdmissibilidade } from './features/admissibilidade/TelaAdmissibilidade'
import { TelaAuditoria } from './features/auditoria/TelaAuditoria'
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
import { NaoEncontrado } from './features/erros/NaoEncontrado'
import { TelaDiligencia, TelaDiligencias, TelaNovaDiligencia } from './features/diligencias/TelaDiligencias'
import { TelaProjecao } from './features/projecao/TelaProjecao'
import { TelaAta } from './features/relatorios/TelaAta'
import { TelaClassificacao } from './features/resultado/TelaClassificacao'
import { ConduzirSessao } from './features/sessoes/ConduzirSessao'
import { NovaSessao } from './features/sessoes/NovaSessao'
import { TelaUsuarios } from './features/usuarios/TelaUsuarios'


/** Tela que exige o perfil admin (gestão de usuários); sem `exige`, basta ter perfil (admin ou presidente). */
const so = (exige: Exigencia | null, tela: ReactNode) => <RotaProtegida exige={exige ?? undefined}>{tela}</RotaProtegida>

export default function App() {
  return (
    <UsuarioProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* Telão: fora do Shell (sem menu), só leitura. */}
          <Route path="/projecao/:ch/:sessaoId" element={so(null, <TelaProjecao />)} />
          <Route
            element={
              <RotaProtegida>
                <AppShell />
              </RotaProtegida>
            }
          >
            <Route index element={<Inicio />} />
            <Route path="chamamentos/novo" element={so(null, <FormChamamento />)} />
            <Route path="chamamentos/:ch" element={so(null, <PainelChamamento />)} />
            <Route path="chamamentos/:ch/editar" element={so(null, <FormChamamento />)} />
            <Route path="chamamentos/:ch/propostas/nova" element={so(null, <FormProposta />)} />
            <Route path="chamamentos/:ch/propostas/:p/editar" element={so(null, <FormProposta />)} />
            <Route path="chamamentos/:ch/sessoes/nova" element={so(null, <NovaSessao />)} />
            <Route path="chamamentos/:ch/sessoes/:s" element={so(null, <ConduzirSessao />)} />
            <Route path="chamamentos/:ch/sessoes/:s/ata" element={so(null, <TelaAta />)} />
            <Route path="chamamentos/:ch/propostas/:p/admissibilidade" element={so(null, <TelaAdmissibilidade />)} />
            <Route path="chamamentos/:ch/propostas/:p/d1" element={so(null, <TelaD1 />)} />
            <Route path="chamamentos/:ch/propostas/:p/d2" element={so(null, <TelaD2 />)} />
            <Route path="chamamentos/:ch/propostas/:p/d2/memoria" element={so(null, <TelaMemoriaD2 />)} />
            <Route path="chamamentos/:ch/propostas/:p/diligencias" element={so(null, <TelaDiligencias />)} />
            <Route path="chamamentos/:ch/propostas/:p/diligencias/nova" element={so(null, <TelaNovaDiligencia />)} />
            <Route path="chamamentos/:ch/propostas/:p/diligencias/:d" element={so(null, <TelaDiligencia />)} />
            <Route path="chamamentos/:ch/lotes/:lote/classificacao" element={so(null, <TelaClassificacao />)} />
            <Route path="oscs" element={so(null, <TelaOscs />)} />
            <Route path="usuarios" element={so('admin', <TelaUsuarios />)} />
            <Route path="auditoria" element={so(null, <TelaAuditoria />)} />
            {/* Qualquer outro endereço (ex.: o antigo /ui): página "não encontrado", dentro do app. */}
            <Route path="*" element={<NaoEncontrado />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </UsuarioProvider>
  )
}
