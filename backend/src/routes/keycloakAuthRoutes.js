const KNOWN_ROLES = ['MEDICO', 'ESTAGIARIO', 'PESQUISADOR'];

export default async function keycloakAuthRoutes(fastify, opts) {
  fastify.post('/keycloak-login', async (req, reply) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return reply.status(400).send({ message: 'Campos "username" e "password" são obrigatórios.' });
    }

    const keycloakUrl  = process.env.KEYCLOAK_URL  || 'https://kiriland.unb.br/keycloak';
    const realm        = process.env.KEYCLOAK_REALM || 'grupo04';
    const clientId     = process.env.KEYCLOAK_CLIENT_ID || 'admin-cli';

    const tokenUrl    = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;
    const userInfoUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/userinfo`;

    // 1. Busca o access_token no Keycloak (servidor → servidor, sem CORS)
    const tokenBody = new URLSearchParams({
      grant_type: 'password',
      client_id:  clientId,
      username,
      password,
      scope: 'openid microprofile-jwt',
    });

    let accessToken;
    try {
      const tokenRes = await fetch(tokenUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    tokenBody.toString(),
        signal:  AbortSignal.timeout(60000)
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({}));
        const msg = err.error_description || err.error || 'Usuário ou senha inválidos.';
        fastify.log.warn(`[keycloak-login] Falha no token: ${msg}`);
        return reply.status(401).send({ message: msg });
      }

      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;
    } catch (err) {
      fastify.log.error(`[keycloak-login] Erro ao conectar no Keycloak: ${err.message}. Cause: ${err.cause ? err.cause.message : 'N/A'}`);
      return reply.status(502).send({ message: 'Não foi possível conectar ao servidor de autenticação.' });
    }

    // 2. Busca dados do usuário no /userinfo para obter a role (groups)
    let userInfo;
    try {
      const infoRes = await fetch(userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal:  AbortSignal.timeout(60000)
      });

      if (!infoRes.ok) throw new Error(`/userinfo retornou ${infoRes.status}`);
      userInfo = await infoRes.json();
    } catch (err) {
      fastify.log.error(`[keycloak-login] Erro no /userinfo: ${err.message}`);
      return reply.status(502).send({ message: 'Falha ao obter dados do usuário no Keycloak.' });
    }

    // 3. Extrai a role do array groups
    const role = (userInfo.groups || []).find(g => KNOWN_ROLES.includes(g)) || null;

    if (!role) {
      fastify.log.warn(`[keycloak-login] Usuário ${username} sem role válida. groups=${JSON.stringify(userInfo.groups)}`);
      return reply.status(403).send({ message: 'Usuário não possui perfil de acesso válido (MEDICO, ESTAGIARIO ou PESQUISADOR).' });
    }

    const responseUser = {
      token:    accessToken,
      username: userInfo.preferred_username || userInfo.upn || username,
      name:     userInfo.name || username,
      role,
    };

    fastify.log.info(`[keycloak-login] Login bem-sucedido: username=${responseUser.username} role=${role}`);

    return responseUser;
  });
}
