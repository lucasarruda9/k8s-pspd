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

const SERVICE = 'api-gateway';

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

await fastify.register(jwt, {
  secret: fastify.config.JWT_SECRET
});

fastify.decorate("authenticate", async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ message: "Token inválido ou ausente" });
  }
});

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
    await fastify.listen({ port: fastify.config.PORT, host: '0.0.0.0' });
    startMetricsServer(SERVICE, process.env.GATEWAY_METRICS_PORT || 9100);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();