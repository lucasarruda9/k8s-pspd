const VALID_ROLES = ['MEDICO', 'ESTAGIARIO', 'PESQUISADOR'];

export default async function mockAuthRoutes(fastify, opts) {
  fastify.post('/mock-login', async (req, reply) => {
    const { username, role } = req.body || {};

    if (!username || typeof username !== 'string' || !username.trim()) {
      return reply.status(400).send({ message: 'Campo "username" é obrigatório.' });
    }

    const normalizedRole = String(role || '').toUpperCase();
    if (!VALID_ROLES.includes(normalizedRole)) {
      return reply.status(400).send({
        message: `Campo "role" inválido. Use um de: ${VALID_ROLES.join(', ')}.`,
      });
    }
    const token = await reply.jwtSign(
      {
        preferred_username: username.trim(),
        role: normalizedRole,
        realm_access: {
          roles: [normalizedRole],
        },
        sub: `mock-${username.trim()}`,
        iss: 'mock-auth',
      },
      { expiresIn: '8h' }
    );

    fastify.log.info(
      `[mock-auth] Login mock: username=${username.trim()} role=${normalizedRole}`
    );

    return { token };
  });
}
