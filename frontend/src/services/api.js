import axios from 'axios';
import { getToken, updateToken, isMockMode } from './keycloak';

// A URL da API Gateway virá do K8s, ou usa localhost por padrão
const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor para injetar o Token JWT em TODAS as requisições para a API Gateway
api.interceptors.request.use(async (config) => {
  if (isMockMode) {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } else {
    const token = getToken();
    if (token) {
      try {
        await updateToken(() => {
          config.headers.Authorization = `Bearer ${getToken()}`;
        });
        if (!config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${getToken()}`;
        }
      } catch (error) {
        console.error('Falha ao atualizar o token JWT', error);
      }
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
