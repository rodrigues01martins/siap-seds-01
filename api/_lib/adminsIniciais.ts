// Administradores iniciais: no primeiro acesso, se o projeto ainda não tiver nenhum administrador,
// a conta com um destes e-mails vira administradora sozinha (PUT /api/usuarios, chamado pelo app).
// Depois disso, novos administradores são definidos na tela Usuários. Para trocar: edite, commit e deploy.

export const ADMINS_INICIAIS: readonly string[] = ['juliano.mrodrigues@goias.gov.br']
