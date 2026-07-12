const USERS = new Map([
  ['med.cardoso', 'MEDICO'],
  ['med.lima', 'MEDICO'],
  ['med.almeida', 'MEDICO'],
  ['med.rocha', 'MEDICO'],
  ['med.monteiro', 'MEDICO'],
  ['est.ferreira', 'ESTAGIARIO'],
  ['est.gomes', 'ESTAGIARIO'],
  ['est.costa', 'ESTAGIARIO'],
  ['est.melo', 'ESTAGIARIO'],
  ['est.dias', 'ESTAGIARIO'],
  ['pes.mendes', 'PESQUISADOR'],
  ['pes.araujo', 'PESQUISADOR'],
  ['pes.silveira', 'PESQUISADOR'],
]);

const MOCK_PASSWORD = 'PseudoPEP2026!';

export default async function mockAuthRoutes(fastify, opts) {
  fastify.post('/mock-login', async (req, reply) => {
    const { username, password } = req.body || {};

    if (!username || typeof username !== 'string' || !username.trim()) {
      return reply.status(400).send({ message: 'Campo "username" é obrigatório.' });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const role = USERS.get(normalizedUsername);
    if (!role || password !== MOCK_PASSWORD) {
      return reply.status(401).send({ message: 'Usuário ou senha incorretos.' });
    }
    const token = await reply.jwtSign(
      {
        preferred_username: normalizedUsername,
        role,
        realm_access: {
          roles: [role],
        },
        sub: `mock-${normalizedUsername}`,
        iss: 'mock-auth',
      },
      { expiresIn: '8h' }
    );

    fastify.log.info(
      `[mock-auth] Login mock: username=${normalizedUsername} role=${role}`
    );

    return { token };
  });
}
