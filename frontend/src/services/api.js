import axios from 'axios';
import { getToken, isMockMode } from './keycloak';
import { getKeycloakToken } from './keycloakAuth';

// A URL da API Gateway virá do K8s, ou usa localhost por padrão
const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor para injetar o Token JWT em TODAS as requisições para a API Gateway
api.interceptors.request.use((config) => {
  //Mock:token gerado localmente pelo backend mock (HS256)
  //Real:token do Keycloak salvo no localStorage pelo keycloakAuth
  const token = isMockMode ? getToken() : getKeycloakToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
