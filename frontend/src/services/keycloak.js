import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: 'http://localhost:8080',
  realm: 'pspd-realm',
  clientId: 'frontend-client'
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
    onLoad: 'check-sso', // Check if already logged in
    silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
    pkceMethod: 'S256',
    checkLoginIframe: false, // Desativa iframe em dev para evitar erros de timeout de SSO
  })
  .then((authenticated) => {
    onAuthenticatedCallback(authenticated);
  })
  .catch(console.error);
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
