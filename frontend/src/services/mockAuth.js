/* eslint-disable sonarjs/no-hardcoded-passwords, sonarjs/no-duplicate-string */
const TOKEN_KEY = 'mock_auth_token';
const USER_KEY  = 'mock_auth_user';

const API_BASE = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000/api';

const VALID_MOCK_USERS = [
  { username: 'med.cardoso', name: 'Ana Cardoso', role: 'MEDICO', password: 'PseudoPEP2026!' },
  { username: 'med.lima', name: 'Bruno Lima', role: 'MEDICO', password: 'PseudoPEP2026!' },
  { username: 'med.almeida', name: 'Carolina Almeida', role: 'MEDICO', password: 'PseudoPEP2026!' },
  { username: 'med.rocha', name: 'Daniel Rocha', role: 'MEDICO', password: 'PseudoPEP2026!' },
  { username: 'med.monteiro', name: 'Elisa Monteiro', role: 'MEDICO', password: 'PseudoPEP2026!' },
  { username: 'est.ferreira', name: 'Lucas Ferreira', role: 'ESTAGIARIO', password: 'PseudoPEP2026!' },
  { username: 'est.gomes', name: 'Mariana Gomes', role: 'ESTAGIARIO', password: 'PseudoPEP2026!' },
  { username: 'est.costa', name: 'Rafael Costa', role: 'ESTAGIARIO', password: 'PseudoPEP2026!' },
  { username: 'est.melo', name: 'Beatriz Melo', role: 'ESTAGIARIO', password: 'PseudoPEP2026!' },
  { username: 'est.dias', name: 'Pedro Dias', role: 'ESTAGIARIO', password: 'PseudoPEP2026!' },
  { username: 'pes.mendes', name: 'Carla Mendes', role: 'PESQUISADOR', password: 'PseudoPEP2026!' },
  { username: 'pes.araujo', name: 'Eduardo Araújo', role: 'PESQUISADOR', password: 'PseudoPEP2026!' },
  { username: 'pes.silveira', name: 'Fernanda Silveira', role: 'PESQUISADOR', password: 'PseudoPEP2026!' },
];

/**
 * faz login local mock do backend, salva o token
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{username: string, role: string, name: string}>}
 */
export async function mockLogin(username, password) {
  const userMatch = VALID_MOCK_USERS.find(u => u.username === username);
  
  if (!userMatch || userMatch.password !== password) {
    throw new Error('Usuário ou senha incorretos.');
  }

  const res = await fetch(`${API_BASE}/auth/mock-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: userMatch.username, role: userMatch.role }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Falha no mock login');
  }

  const { token } = await res.json();
  const user = { username: userMatch.username, role: userMatch.role, name: userMatch.name };

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  return user;
}

export function mockLogout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getMockToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

/**
 * retorna os dado mockado ou null
 * @returns {{username: string, role: string}|null}
 */
export function getMockUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isMockAuthenticated() {
  return getMockToken() !== null;
}
