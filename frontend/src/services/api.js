import axios from 'axios';
import keycloak from './keycloak';

// A URL da API Gateway virá do K8s, ou usa localhost por padrão
const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor para injetar o Token JWT em TODAS as requisições para a API Gateway
api.interceptors.request.use(async (config) => {
  if (keycloak && keycloak.token) {
    try {
      // Atualiza o token se ele estiver a menos de 5 segundos de expirar
      await keycloak.updateToken(5);
      config.headers.Authorization = `Bearer ${keycloak.token}`;
    } catch (error) {
      console.error('Falha ao atualizar o token JWT', error);
      keycloak.login();
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
