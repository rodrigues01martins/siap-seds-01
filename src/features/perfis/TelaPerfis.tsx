// /perfis (admin): usuários com perfil (usuarios/{uid}); dar, trocar e remover perfil (C6, /api/perfis).
// O admin não remove o próprio perfil de administrador (a /api também recusa com 409).

import { useState } from 'react'
import { AlertaErro } from '../../componentes/AlertaErro'
import { Botao, EstadoLeitura, Secao, Titulo } from '../../componentes/basicos'
import { Campo, CampoSelecao, Formulario } from '../../componentes/Formulario'
import { Tabela } from '../../componentes/Tabela'
import { PERFIS, type Perfil } from '../../domain/perfis'
import { esquemaDefinirPerfil } from '../../esquemas/cadastros'
import { chamarApi } from '../../lib/api'
import { useColecao, type ComId } from '../../lib/firestore'
import type { UsuarioCadastro } from '../../lib/tipos'
import { useUsuario } from '../auth/useUsuario'

const OPCOES = PERFIS.map((p) => ({ valor: p, rotulo: p }))

export function TelaPerfis() {
  const { usuario } = useUsuario()
  const usuarios = useColecao<UsuarioCadastro>('usuarios')
  const [erro, setErro] = useState<unknown>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const linhas = usuarios.dados.filter((u) => u.perfil).sort((a, b) => a.email.localeCompare(b.email))

  async function executar(acao: () => Promise<unknown>, mensagem: string) {
    setErro(null)
    setAviso(null)
    try {
      await acao()
      setAviso(mensagem)
    } catch (e) {
      setErro(e)
    }
  }

  const proprioAdmin = (u: ComId<UsuarioCadastro>) => u.id === usuario?.uid && u.perfil === 'admin'

  return (
    <>
      <Titulo>Perfis de acesso</Titulo>
      <div className="max-w-xl rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-1 font-semibold">Dar ou trocar perfil</h2>
        <p className="mb-3 text-sm text-slate-600">
          O usuário precisa existir no Firebase Authentication (criado no console do Firebase).
        </p>
        <Formulario
          esquema={esquemaDefinirPerfil}
          valoresIniciais={{ email: '', perfil: '' }}
          limparAoConcluir
          rotuloEnviar="Aplicar perfil"
          onEnviar={async (dados) => {
            setAviso(null)
            await chamarApi('/api/perfis', { metodo: 'POST', corpo: dados })
            setAviso(`Perfil ${dados.perfil} aplicado a ${dados.email}.`)
          }}
        >
          <Campo nome="email" rotulo="E-mail" tipo="email" />
          <CampoSelecao nome="perfil" rotulo="Perfil" opcoes={OPCOES} vazio="Selecione o perfil…" />
        </Formulario>
      </div>

      <Secao titulo="Usuários com perfil">
        <div className="mb-3 space-y-2">
          <AlertaErro erro={erro} />
          {aviso && (
            <p role="status" className="text-sm text-emerald-800">
              {aviso}
            </p>
          )}
        </div>
        <EstadoLeitura carregando={usuarios.carregando} erro={usuarios.erro} />
        {!usuarios.carregando && !usuarios.erro && (
          <Tabela
            rotulo="Usuários com perfil"
            linhas={linhas}
            chave={(u) => u.id}
            vazio="Nenhum usuário com perfil."
            colunas={[
              { titulo: 'E-mail', celula: (u) => u.email },
              {
                titulo: 'Perfil',
                celula: (u) => (
                  <select
                    aria-label={`Perfil de ${u.email}`}
                    value={u.perfil ?? ''}
                    disabled={proprioAdmin(u)}
                    onChange={(e) =>
                      executar(
                        () => chamarApi('/api/perfis', { metodo: 'POST', corpo: { email: u.email, perfil: e.target.value as Perfil } }),
                        `Perfil de ${u.email} alterado para ${e.target.value}.`,
                      )
                    }
                    className="rounded-md border border-slate-300 px-2 py-1 disabled:bg-slate-100"
                  >
                    {PERFIS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                ),
              },
              {
                titulo: 'Ações',
                celula: (u) =>
                  proprioAdmin(u) ? (
                    <span className="text-xs text-slate-500">Você não pode remover o seu próprio perfil de administrador.</span>
                  ) : (
                    <Botao
                      perigo
                      onClick={() => {
                        if (!window.confirm(`Remover o perfil de ${u.email}? O acesso será encerrado.`)) return
                        void executar(
                          () => chamarApi('/api/perfis', { metodo: 'DELETE', corpo: { email: u.email } }),
                          `Perfil de ${u.email} removido.`,
                        )
                      }}
                    >
                      Remover perfil
                    </Botao>
                  ),
              },
            ]}
          />
        )}
      </Secao>
    </>
  )
}
