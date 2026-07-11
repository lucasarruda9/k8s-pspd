import { decideAuthorization } from '../src/services/authorization/rules.js';
import {
  decodeJwtPayload,
  extractIdentity,
  normalizeRole,
} from '../src/services/authorization/jwt.js';

/** Cria um JWT fake (assinatura irrelevante — quem verifica é o Gateway). */
function fakeJwt(payload) {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.assinatura-fake`;
}

/**
 * Repositório FAKE (assíncrono, igual ao real) — mantém os testes de regra de
 * negócio independentes do PostgreSQL. O repositório real é exercitado na
 * validação funcional com o banco de pé.
 *
 * Vínculos simulados:
 *   med.cardoso  (médico)      → P000001, P000002
 *   est.almeida  (estagiário)  → P000001 (supervisionado)
 *   pesq.lima    (pesquisador) → PRJ01 aprovado; PRJ02 inválido
 */
const fakeRepo = {
  async isPatientLinkedToDoctor(username, patientId) {
    return username === 'med.cardoso' && ['P000001', 'P000002'].includes(patientId);
  },
  async isPatientSupervisedByIntern(username, patientId) {
    return username === 'est.almeida' && patientId === 'P000001';
  },
  async getValidResearchProject(username, projectId) {
    if (username === 'pesq.lima' && projectId === 'PRJ01') {
      return { id_projeto: 'PRJ01', codigo_condicao: 'DIABETES' };
    }
    return null; // PRJ02: expirado/não aprovado
  },
};

const auth = (payload, request) =>
  decideAuthorization(extractIdentity(payload), request, fakeRepo);

describe('jwt — extração de identidade', () => {
  test('decodifica payload e normaliza role do Keycloak (realm_access)', () => {
    const token = fakeJwt({
      preferred_username: 'med.cardoso',
      realm_access: { roles: ['offline_access', 'medico'] },
    });
    const id = extractIdentity(decodeJwtPayload(token));
    expect(id.username).toBe('med.cardoso');
    expect(id.role).toBe('MEDICO');
  });

  test('normalizeRole aceita variações e acentuação', () => {
    expect(normalizeRole('MEDICO')).toBe('MEDICO');
    expect(normalizeRole('estagiário')).toBe('ESTAGIARIO');
    expect(normalizeRole('researcher')).toBe('PESQUISADOR');
    expect(normalizeRole('admin')).toBeNull();
  });
});

describe('rules — decisão de autorização por perfil', () => {
  test('CT-01 Médico com paciente vinculado → ALLOW + FULL', async () => {
    const r = await auth(
      { preferred_username: 'med.cardoso', role: 'medico' },
      { query_type: 'ResumoClinico', target_id: 'P000001' },
    );
    expect(r.status).toBe('ALLOW');
    expect(r.access_level).toBe('FULL');
  });

  test('CT-02 Médico com paciente NÃO vinculado → DENY', async () => {
    const r = await auth(
      { preferred_username: 'med.cardoso', role: 'medico' },
      { query_type: 'ResumoClinico', target_id: 'P000004' },
    );
    expect(r.status).toBe('DENY');
  });

  test('CT-03 Estagiário supervisionado → ALLOW + PARTIAL', async () => {
    const r = await auth(
      { preferred_username: 'est.almeida', role: 'estagiario' },
      { query_type: 'ResumoClinico', target_id: 'P000001' },
    );
    expect(r.status).toBe('ALLOW');
    expect(r.access_level).toBe('PARTIAL');
  });

  test('CT-04 Estagiário fora da supervisão → DENY', async () => {
    const r = await auth(
      { preferred_username: 'est.almeida', role: 'estagiario' },
      { query_type: 'ResumoClinico', target_id: 'P000002' },
    );
    expect(r.status).toBe('DENY');
  });

  test('CT-05 Pesquisador, projeto aprovado, ResumoCoorte → ALLOW + AGGREGATED', async () => {
    const r = await auth(
      { preferred_username: 'pesq.lima', role: 'pesquisador' },
      { query_type: 'ResumoCoorte', target_id: 'PRJ01' },
    );
    expect(r.status).toBe('ALLOW');
    expect(r.access_level).toBe('AGGREGATED');
  });

  test('CT-06 Pesquisador, exames por paciente → ALLOW + ANONYMIZED', async () => {
    const r = await auth(
      { preferred_username: 'pesq.lima', role: 'pesquisador' },
      { query_type: 'ExamesCoorte', target_id: 'PRJ01' },
    );
    expect(r.status).toBe('ALLOW');
    expect(r.access_level).toBe('ANONYMIZED');
  });

  test('CT-07 Pesquisador em projeto EXPIRADO → DENY', async () => {
    const r = await auth(
      { preferred_username: 'pesq.lima', role: 'pesquisador' },
      { query_type: 'ResumoCoorte', target_id: 'PRJ02' },
    );
    expect(r.status).toBe('DENY');
  });

  test('CT-08 Token sem role reconhecida → DENY', async () => {
    const r = await auth(
      { preferred_username: 'fulano', role: 'gerente' },
      { query_type: 'ResumoClinico', target_id: 'P000001' },
    );
    expect(r.status).toBe('DENY');
  });

  test('target_id ausente → DENY', async () => {
    const r = await auth(
      { preferred_username: 'med.cardoso', role: 'medico' },
      { query_type: 'ResumoClinico', target_id: '' },
    );
    expect(r.status).toBe('DENY');
  });
});
