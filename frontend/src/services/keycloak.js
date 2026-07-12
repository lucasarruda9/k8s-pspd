import Keycloak from 'keycloak-js';
import { getMockToken, isMockAuthenticated } from './mockAuth';

const MOCK_MODE = import.meta.env.VITE_AUTH_MOCK === 'true';

if (MOCK_MODE) {
  console.info('[Auth] Modo mock ativo — Keycloak desabilitado.');
}

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'https://kiriland.unb.br/keycloak',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'grupo04',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'frontend-client'
};

const keycloak = MOCK_MODE ? null : new Keycloak(keycloakConfig);

let isInitialized = false;

export const initKeycloak = (onAuthenticatedCallback) => {
  if (MOCK_MODE) {
    onAuthenticatedCallback(isMockAuthenticated());
    return;
  }

  if (isInitialized) {
    onAuthenticatedCallback(keycloak.authenticated);
    return;
  }
  isInitialized = true;

  keycloak.init({
    // onLoad: 'check-sso', //ta dando erro de  Content Security Policy (CSP)
    // silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
    pkceMethod: 'S256',
    checkLoginIframe: false, // Desativa iframe em dev para evitar erros de timeout de SSO e CSP
  })
  .then((authenticated) => {
    onAuthenticatedCallback(authenticated);
  })
  .catch((err) => {
    console.error('Erro na inicialização do Keycloak:', err);
    onAuthenticatedCallback(false);
  });
};

export const doLogin  = MOCK_MODE ? () => {} : keycloak.login.bind(keycloak);
export const doLogout = MOCK_MODE ? () => {} : keycloak.logout.bind(keycloak);
export const getToken = MOCK_MODE
  ? getMockToken
  : () => keycloak?.token;
export const getParsedToken = MOCK_MODE
  ? () => null
  : () => keycloak?.tokenParsed;
export const updateToken = MOCK_MODE
  ? (cb) => Promise.resolve().then(cb)
  : (successCallback) => keycloak.updateToken(5).then(successCallback).catch(doLogin);
export const isMockMode = MOCK_MODE;

export default keycloak;
