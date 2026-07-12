const TOKEN_KEY = 'kc_auth_token';
const USER_KEY  = 'kc_auth_user';

const API_BASE = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000/api';

/**
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{username, role, name, token}>}
 */
export async function keycloakLogin(username, password) {
  const res = await fetch(`${API_BASE}/auth/keycloak-login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Usuário ou senha inválidos.');
  }

  const user = await res.json();
  // { token, username, name, role }

  localStorage.setItem(TOKEN_KEY, user.token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  return user;
}

export function keycloakLogout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getKeycloakToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function getKeycloakUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function isKeycloakAuthenticated() {
  return getKeycloakToken() !== null;
}
