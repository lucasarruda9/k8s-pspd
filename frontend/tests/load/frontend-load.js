import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuração dos cenários de teste exigidos na Fase 3
export const options = {
  stages: [
    { duration: '15s', target: 10 },   // Simula 10 usuários
    { duration: '30s', target: 50 },   // Sobe para 50 usuários
    { duration: '45s', target: 100 },  // Pico de 100 usuários
    { duration: '15s', target: 0 },    // Resfriamento
  ],
  thresholds: {
    // 95% das requisições devem ser resolvidas em menos de 500ms
    http_req_duration: ['p(95)<500'], 
    // Taxa de erro deve ser menor que 1%
    http_req_failed: ['rate<0.01'],   
  }
};

export default function () {
  // Passar a URL via linha de comando: k6 run -e FRONTEND_URL=http://localhost:30000 tests/load/frontend-load.js
  const BASE_URL = __ENV.FRONTEND_URL || 'http://localhost'; 

  // Simula o carregamento da página principal do React (Dashboard)
  const res = http.get(`${BASE_URL}/`);

  check(res, {
    'status é 200 (OK)': (r) => r.status === 200,
  });

  // Simula o tempo que o usuário fica olhando a tela antes de clicar em algo
  sleep(1);
}
