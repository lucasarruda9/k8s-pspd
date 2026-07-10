import http from 'node:http';
import client from 'prom-client';
import { config } from '../config.js';
import { createLogger } from './logger.js';

const register = new client.Registry();
client.collectDefaultMetrics({ register }); // CPU, memória, event loop, etc.

const grpcRequests = new client.Counter({
  name: 'grpc_requests_total',
  help: 'Total de requisições gRPC recebidas',
  labelNames: ['service', 'method', 'status'],
  registers: [register],
});

const grpcLatency = new client.Histogram({
  name: 'grpc_request_duration_seconds',
  help: 'Latência das requisições gRPC em segundos',
  labelNames: ['service', 'method', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

// --- Métricas de negócio (Painel de Auditoria / conformidade médica) ---
export const authDecisions = new client.Counter({
  name: 'auth_decisions_total',
  help: 'Decisões de autorização por resultado e role',
  labelNames: ['decision', 'role', 'access_level'],
  registers: [register],
});

export function instrument(service, method, handler) {
  return (call, callback) => {
    const stop = grpcLatency.startTimer({ service, method });
    const wrappedCallback = (err, response) => {
      const status = err ? 'error' : 'ok';
      grpcRequests.inc({ service, method, status });
      stop({ status });
      callback(err, response);
    };
    try {
      handler(call, wrappedCallback);
    } catch (err) {
      wrappedCallback(err);
    }
  };
}

/** Sobe o servidor HTTP /metrics para o Prometheus raspar. */
export function startMetricsServer(serviceName, port = config.metricsPort) {
  const log = createLogger(serviceName);
  const server = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.setHeader('Content-Type', register.contentType);
      res.end(await register.metrics());
    } else if (req.url === '/healthz') {
      res.statusCode = 200;
      res.end('ok');
    } else {
      res.statusCode = 404;
      res.end('not found');
    }
  });
  server.listen(port, () => log.info('metrics endpoint ativo', { port: Number(port) }));
  return server;
}

export { register };
