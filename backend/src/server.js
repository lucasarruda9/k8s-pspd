import './tracer.js';

import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import env from '@fastify/env';

import authRoutes from './routes/authRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import transformRoutes from './routes/transformRoutes.js';

import { grpcClient } from './grpc/client.js';
import { start as startAuth } from './services/authorization/server.js';
import { start as startPatient } from './services/patientData/server.js';

const fastify = Fastify({ logger: true });

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

async function getPublicKey() {
  if (publicKey) return publicKey;
  try {
    const realm = process.env.KEYCLOAK_REALM || 'pspd-realm'; //pra poder testar localmente
    let realmRes;
    try {
      realmRes = await fetch(`http://keycloak:8080/realms/${realm}`);
    } catch (err) {
      realmRes = await fetch(`${process.env.KEYCLOAK_URL || 'http://localhost:8080'}/realms/${realm}`);
    }
    
    if (realmRes && realmRes.ok) {
      const realmData = await realmRes.json();
      publicKey = `-----BEGIN PUBLIC KEY-----\n${realmData.public_key}\n-----END PUBLIC KEY-----`;
      fastify.log.info("Chave pública do Keycloak obtida com sucesso.");
      return publicKey;
    }
  } catch (e) {
    fastify.log.warn("Falha ao buscar chave pública: " + e.message);
  }
  return fastify.config.JWT_SECRET;
}

await fastify.register(jwt, {
  secret: async (request, token) => {
    return await getPublicKey();
  },
  verify: { algorithms: ['RS256', 'HS256'] }
});

fastify.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ message: "Token inválido ou ausente" });
  }
});

fastify.decorate("grpcClient", grpcClient);

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

const start = async () => {
  try {
    startAuth();
    startPatient();
    
    await fastify.listen({ port: fastify.config.PORT, host: '0.0.0.0' });
    fastify.log.info('Gateway rodando em http://localhost:3000');
    fastify.log.info('Documentação em http://localhost:3000/docs');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();