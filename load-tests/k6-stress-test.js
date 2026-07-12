import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const queryDuration = new Trend('query_duration');

const BASE_URL = __ENV.GATEWAY_URL || 'http://localhost:3000/api';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m',  target: 50 },
    { duration: '1m',  target: 100 },
    { duration: '2m',  target: 500 },
    { duration: '2m',  target: 1000 },
    { duration: '1m',  target: 0 },
  ],
  thresholds: {
    http_req_failed:   ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
    errors:            ['rate<0.01'],
  },
};

function login() {
  const payload = JSON.stringify({ username: 'med.cardoso', password: 'PseudoPEP2026!' });
  const params  = { headers: { 'Content-Type': 'application/json' } };

  const start = Date.now();
  const res   = http.post(`${BASE_URL}/auth/keycloak-login`, payload, params);
  loginDuration.add(Date.now() - start);

  const ok = check(res, {
    'login: status 200':   (r) => r.status === 200,
    'login: token presente': (r) => r.json('token') !== undefined,
  });

  errorRate.add(!ok);
  return ok ? res.json('token') : null;
}

function consultarPaciente(token) {
  const params = { headers: { Authorization: `Bearer ${token}` } };

  const start = Date.now();
  const res   = http.get(`${BASE_URL}/patients`, params);
  queryDuration.add(Date.now() - start);

  const ok = check(res, {
    'consulta: status 200 ou 404': (r) => r.status === 200 || r.status === 404,
  });

  errorRate.add(!ok);
}

export default function () {
  const token = login();

  if (token) {
    consultarPaciente(token);
  }

  sleep(1);
}
