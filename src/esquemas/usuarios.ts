// Gestão de usuários (tela Usuários, /api/usuarios): novo usuário (convite) e alterações.

import { PAPEIS_COMISSAO } from '../domain/comissao.js'
import { PERMISSOES } from '../domain/permissoes.js'
import { algumCampoAlem, idDocumento, semRepeticao, z } from './base.js'

const nome = z.string({ error: 'Informe o nome.' }).trim().min(3, 'Informe o nome (ao menos 3 letras).').max(120, 'Use no máximo 120 caracteres.')

const email = z.preprocess(
  (valor) => (typeof valor === 'string' ? valor.trim().toLowerCase() : valor),
  z.email({ error: 'Informe um e-mail válido.' }),
)

const permissoes = z
  .array(z.enum(PERMISSOES as [string, ...string[]], { error: 'Permissão desconhecida.' }))
  .refine(semRepeticao(), 'Há permissões repetidas.')

/** Papel na Comissão; vazio ou null = sem papel. */
const comissao = z.preprocess(
  (valor) => (valor === '' || valor === undefined ? null : valor),
  z.enum(PAPEIS_COMISSAO, { error: 'Papel inválido: use presidente, relator ou membro.' }).nullable(),
)

const simNao = z.boolean({ error: 'Use verdadeiro ou falso.' })

export const esquemaNovoUsuario = z.strictObject({ nome, email, admin: simNao, permissoes, comissao })

export const esquemaAlterarUsuario = z
  .strictObject({
    uid: idDocumento,
    nome: nome.optional(),
    admin: simNao.optional(),
    ativo: simNao.optional(),
    permissoes: permissoes.optional(),
    comissao: z
      .preprocess((valor) => (valor === '' ? null : valor), z.enum(PAPEIS_COMISSAO, { error: 'Papel inválido: use presidente, relator ou membro.' }).nullable())
      .optional(),
  })
  .refine(algumCampoAlem(['uid']), 'Informe ao menos um campo para alterar.')

export type NovoUsuario = z.infer<typeof esquemaNovoUsuario>
export type AlterarUsuario = z.infer<typeof esquemaAlterarUsuario>
