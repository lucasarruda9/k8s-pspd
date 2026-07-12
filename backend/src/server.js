import './tracer.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
try {
  const __dir = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(__dir, '../.env'); // backend/src/../.env = backend/.env
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!(key in process.env)) process.env[key] = val; // não sobrescreve vars do shell
  }
} catch { /* .env não encontrado: ok em produção */ }

import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import env from '@fastify/env';
import { startMetricsServer } from './shared/metrics.js';

import authRoutes from './routes/authRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import transformRoutes from './routes/transformRoutes.js';
import mockAuthRoutes from './routes/mockAuthRoutes.js';
import keycloakAuthRoutes from './routes/keycloakAuthRoutes.js';

import { grpcClient } from './grpc/client.js';
import { mockGrpcClient } from './grpc/mockClient.js';

const SERVICE = 'api-gateway';
const JWT_MOCK = process.env.JWT_MOCK === 'true';
const GRPC_MOCK = process.env.GRPC_MOCK === 'true';

if (JWT_MOCK) {
  console.info('[Auth] JWT_MOCK=true — modo desenvolvimento ativo. Keycloak desabilitado.');
}

const fastify = Fastify({ logger: true, bodyLimit: 52428800 });

await fastify.register(cors);

await fastify.register(env, {
  schema: {
    type: 'object',
    required: ['JWT_SECRET'],
    properties: {
      JWT_SECRET: { type: 'string' },
      PORT: { type: 'number', default: 3000 }
    }
  },
  dotenv: true
});

let publicKey = null;

const KNOWN_ROLES = new Set(['MEDICO', 'ESTAGIARIO', 'PESQUISADOR']);

async function getPublicKey() {
  if (JWT_MOCK) {
    return fastify.config.JWT_SECRET;
  }
  if (publicKey) return publicKey;
  try {
    const realm = process.env.KEYCLOAK_REALM || 'grupo04';
    const keycloakUrl = process.env.KEYCLOAK_URL || 'https://kiriland.unb.br/keycloak';
    
    let realmRes = await fetch(`${keycloakUrl}/realms/${realm}`);
    
    if (!realmRes.ok) {
      throw new Error(`Falha HTTP: ${realmRes.status}`);
    }
    
    const realmData = await realmRes.json();
    publicKey = `-----BEGIN PUBLIC KEY-----\n${realmData.public_key}\n-----END PUBLIC KEY-----`;
    fastify.log.info('Chave pública do Keycloak obtida com sucesso.');
    return publicKey;
  } catch (e) {
    fastify.log.warn('Falha ao buscar chave pública: ' + e.message);
  }
  return fastify.config.JWT_SECRET;
}

async function fetchUserInfoFromKeycloak(bearerToken) {
  const keycloakUrl = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
  const realm = process.env.KEYCLOAK_REALM || 'pspd-realm';
  const url = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/userinfo`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${bearerToken}` }
  });
  if (!res.ok) throw new Error(`Keycloak /userinfo retornou ${res.status}`);
  const info = await res.json();
  const role = (info.groups || []).find(g => KNOWN_ROLES.has(g)) || null;
  const username = info.preferred_username || info.upn || null;
  return { username, role, name: info.name || username };
}

await fastify.register(jwt, {
  secret: async (request, token) => {
    return await getPublicKey();
  },
  verify: { algorithms: JWT_MOCK ? ['HS256'] : ['RS256', 'HS256'] }
});

fastify.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
    if (!JWT_MOCK) {
      const rawToken = (request.headers.authorization || '').replace('Bearer ', '');
      const userInfo = await fetchUserInfoFromKeycloak(rawToken);
      request.user = { ...request.user, ...userInfo };
      fastify.log.info({ username: userInfo.username, role: userInfo.role }, 'Identidade via /userinfo');
    }
  } catch (err) {
    fastify.log.warn('Falha na autenticação: ' + err.message);
    reply.status(401).send({ message: 'Token inválido ou ausente' });
  }
});

fastify.decorate("grpcClient", GRPC_MOCK ? mockGrpcClient : grpcClient);

if (GRPC_MOCK) {
  fastify.log.info('[mock-grpc] Usando mockGrpcClient — serviços gRPC não são necessários.');
}

// Swagger 
await fastify.register(swagger, {
  openapi: {
    info: {
      title: 'PSPD API - Gateway de Microsserviços',
      description: 'API centralizadora para sistema clínico FHIR',
      version: '1.0.0'
    }
  }
});

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list' }
});


await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(patientRoutes, { prefix: '/api/patients' });
await fastify.register(transformRoutes, { prefix: '/api/transform' });
await fastify.register(keycloakAuthRoutes, { prefix: '/api/auth' });

if (JWT_MOCK) {
  await fastify.register(mockAuthRoutes, { prefix: '/api/auth' });
  fastify.log.info('[mock-auth] Endpoint POST /api/auth/mock-login registrado.');
}

const start = async () => {
  try {
    await fastify.listen({ port: fastify.config.PORT, host: '0.0.0.0' });
    startMetricsServer(SERVICE, process.env.GATEWAY_METRICS_PORT || 9100);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
