import { ACCESS_LEVELS } from '../../shared/accessLevels.js';

const { FULL, PARTIAL, ANONYMIZED, AGGREGATED } = ACCESS_LEVELS;

const DENY = (username, role, reason) => ({
  status: 'DENY',
  access_level: '',
  username: username || '',
  role: role || '',
  reason,
});

const AGGREGATED_QUERIES = new Set([
  'resumocoorte',
  'estatisticascoorte',
  'estatisticas',
  'coorteagregada',
]);

function decideResearcherLevel(queryType) {
  const q = String(queryType || '').toLowerCase();
  return AGGREGATED_QUERIES.has(q) ? AGGREGATED : ANONYMIZED;
}

/**
 * Decide ALLOW/DENY + nível de acesso. Assíncrona porque as checagens de
 * vínculo consultam o PostgreSQL.
 *
 * @param {{username, role}} identity  identidade extraída do JWT
 * @param {{query_type, target_id}} request
 * @param {object} repo  authRepository (injetável nos testes)
 */
export async function decideAuthorization(identity, request, repo) {
  const { username, role } = identity;
  const { query_type, target_id } = request;

  if (!username || !role) {
    return DENY(username, role, 'token inválido ou role não reconhecida');
  }

  switch (role) {
    case 'MEDICO': {
      if (!target_id) return DENY(username, role, 'target_id (paciente) ausente');
      if (await repo.isPatientLinkedToDoctor(username, target_id)) {
        return { status: 'ALLOW', access_level: FULL, username, role, reason: 'vínculo médico ativo' };
      }
      return DENY(username, role, 'paciente não vinculado ao médico');
    }

    case 'ESTAGIARIO': {
      if (!target_id) return DENY(username, role, 'target_id (paciente) ausente');
      if (await repo.isPatientSupervisedByIntern(username, target_id)) {
        return { status: 'ALLOW', access_level: PARTIAL, username, role, reason: 'supervisão ativa' };
      }
      return DENY(username, role, 'paciente fora da supervisão do estagiário');
    }

    case 'PESQUISADOR': {
      if (!target_id) return DENY(username, role, 'target_id (projeto) ausente');
      const project = await repo.getValidResearchProject(username, target_id);
      if (project) {
        return {
          status: 'ALLOW',
          access_level: decideResearcherLevel(query_type),
          username,
          role,
          reason: `projeto ${project.id_projeto} aprovado e vigente`,
        };
      }
      return DENY(username, role, 'projeto inexistente, não aprovado ou expirado');
    }

    default:
      return DENY(username, role, `role não suportada: ${role}`);
  }
}
