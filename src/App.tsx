import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Shell } from './componentes/Shell'
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
import { TelaDiligencias } from './features/diligencias/TelaDiligencias'
import { TelaProjecao } from './features/projecao/TelaProjecao'
import { TelaAta } from './features/relatorios/TelaAta'
import { TelaClassificacao } from './features/resultado/TelaClassificacao'
import { ConduzirSessao } from './features/sessoes/ConduzirSessao'
import { NovaSessao } from './features/sessoes/NovaSessao'
import { TelaUsuarios } from './features/usuarios/TelaUsuarios'

/** Catálogo de componentes (/ui, administrador): carregado só quando aberto. */
const TelaCatalogo = lazy(() => import('./features/catalogo/TelaCatalogo').then((m) => ({ default: m.TelaCatalogo })))

/** Tela que exige uma permissão (ou o administrador); sem `exige`, basta ter acesso ao app. */
const so = (exige: Exigencia | null, tela: ReactNode) => <RotaProtegida exige={exige ?? undefined}>{tela}</RotaProtegida>

export default function App() {
  return (
    <UsuarioProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* Telão: fora do Shell (sem menu), só leitura. */}
          <Route path="/projecao/:ch/:sessaoId" element={so(null, <TelaProjecao />)} />
          <Route
            element={
              <RotaProtegida>
                <Shell />
              </RotaProtegida>
            }
          >
            <Route index element={<Inicio />} />
            <Route path="chamamentos/novo" element={so('chamamentos', <FormChamamento />)} />
            <Route path="chamamentos/:ch" element={so(null, <PainelChamamento />)} />
            <Route path="chamamentos/:ch/editar" element={so('chamamentos', <FormChamamento />)} />
            <Route path="chamamentos/:ch/propostas/nova" element={so('propostas', <FormProposta />)} />
            <Route path="chamamentos/:ch/propostas/:p/editar" element={so('propostas', <FormProposta />)} />
            <Route path="chamamentos/:ch/sessoes/nova" element={so('sessaoAbrirEncerrar', <NovaSessao />)} />
            <Route path="chamamentos/:ch/sessoes/:s" element={so(null, <ConduzirSessao />)} />
            <Route path="chamamentos/:ch/sessoes/:s/ata" element={so(null, <TelaAta />)} />
            <Route path="chamamentos/:ch/propostas/:p/admissibilidade" element={so(null, <TelaAdmissibilidade />)} />
            <Route path="chamamentos/:ch/propostas/:p/d1" element={so(null, <TelaD1 />)} />
            <Route path="chamamentos/:ch/propostas/:p/d2" element={so(null, <TelaD2 />)} />
            <Route path="chamamentos/:ch/propostas/:p/d2/memoria" element={so(null, <TelaMemoriaD2 />)} />
            <Route path="chamamentos/:ch/propostas/:p/diligencias" element={so(null, <TelaDiligencias />)} />
            <Route path="chamamentos/:ch/lotes/:lote/classificacao" element={so(null, <TelaClassificacao />)} />
            <Route path="oscs" element={so('oscs', <TelaOscs />)} />
            <Route path="usuarios" element={so('admin', <TelaUsuarios />)} />
            <Route path="auditoria" element={so('admin', <TelaAuditoria />)} />
            <Route
              path="ui"
              element={so(
                'admin',
                <Suspense fallback={<p className="text-body-md text-text-secondary">Carregando catálogo…</p>}>
                  <TelaCatalogo />
                </Suspense>,
              )}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </UsuarioProvider>
  )
}
