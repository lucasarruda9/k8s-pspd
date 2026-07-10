export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const ROLE_MAP = {
  medico: 'MEDICO',
  doctor: 'MEDICO',
  estagiario: 'ESTAGIARIO',
  intern: 'ESTAGIARIO',
  pesquisador: 'PESQUISADOR',
  researcher: 'PESQUISADOR',
};

export function normalizeRole(rawRole) {
  if (!rawRole) return null;
  const key = String(rawRole)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  return ROLE_MAP[key] || null;
}

/** Extrai { username, role } do payload, tolerando formatos de Keycloak. */
export function extractIdentity(payload) {
  if (!payload) return { username: null, role: null };

  const username =
    payload.preferred_username || payload.username || payload.sub || null;

  let rawRole = payload.role || payload.roles;
  if (Array.isArray(rawRole)) {
    rawRole = rawRole.find((r) => normalizeRole(r)) || rawRole[0];
  }
  if (!rawRole && payload.realm_access?.roles) {
    rawRole = payload.realm_access.roles.find((r) => normalizeRole(r));
  }

  return { username, role: normalizeRole(rawRole) };
}
