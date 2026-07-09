import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import authRoutes from './routes/authRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import transformRoutes from './routes/transformRoutes.js';

const fastify = Fastify({ logger: true });

// 1. Configuração do Swagger
await fastify.register(swagger, {
  swagger: {
    info: {
      title: 'PSPD API - Gateway de Microsserviços',
      description: 'API centralizadora para sistema clínico FHIR',
      version: '1.0.0'
    },
    host: 'localhost:3000',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json']
  }
});

// 2. Configuração da UI (Interface visual)
await fastify.register(swaggerUi, {
  routePrefix: '/docs', // Acesse: http://localhost:3000/docs
  uiConfig: { docExpansion: 'full' }
});

// 3. Registro das rotas (mantive igual)
fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(patientRoutes, { prefix: '/api/patients' });
fastify.register(transformRoutes, { prefix: '/api/transform' });

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('Gateway rodando. Documentação em http://localhost:3000/docs');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();