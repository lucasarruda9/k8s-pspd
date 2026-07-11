import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'https://kiriland.unb.br/keycloak',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'grupo04',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'frontend-client'
};

const keycloak = new Keycloak(keycloakConfig);

let isInitialized = false;

export const initKeycloak = (onAuthenticatedCallback) => {
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

export const doLogin = keycloak.login;
export const doLogout = keycloak.logout;
export const getToken = () => keycloak.token;
export const getParsedToken = () => keycloak.tokenParsed;
export const updateToken = (successCallback) =>
  keycloak.updateToken(5)
    .then(successCallback)
    .catch(doLogin);

export default keycloak;
