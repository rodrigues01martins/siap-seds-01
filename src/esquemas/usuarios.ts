// Gestão de usuários (tela Usuários, /api/usuarios): novo usuário (convite) e alterações. Só dois perfis,
// admin e presidente; os campos do modelo anterior (admin, permissões, papel na Comissão) não existem mais.

import { PERFIS } from '../domain/permissoes.js'
import { algumCampoAlem, idDocumento, z } from './base.js'

const nome = z.string({ error: 'Informe o nome.' }).trim().min(3, 'Informe o nome (ao menos 3 letras).').max(120, 'Use no máximo 120 caracteres.')

const email = z.preprocess(
  (valor) => (typeof valor === 'string' ? valor.trim().toLowerCase() : valor),
  z.email({ error: 'Informe um e-mail válido.' }),
)

const perfil = z.enum(PERFIS, { error: 'Perfil inválido: use admin ou presidente.' })

const simNao = z.boolean({ error: 'Use verdadeiro ou falso.' })

export const esquemaNovoUsuario = z.strictObject({ nome, email, perfil })

export const esquemaAlterarUsuario = z
  .strictObject({
    uid: idDocumento,
    nome: nome.optional(),
    perfil: perfil.optional(),
    ativo: simNao.optional(),
  })
  .refine(algumCampoAlem(['uid']), 'Informe ao menos um campo para alterar.')

export type NovoUsuario = z.infer<typeof esquemaNovoUsuario>
export type AlterarUsuario = z.infer<typeof esquemaAlterarUsuario>
