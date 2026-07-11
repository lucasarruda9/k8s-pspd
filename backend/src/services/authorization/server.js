import { clinicalProto, grpc } from '../../grpc/loader.js';
import { config } from '../../config.js';
import { createLogger } from '../../shared/logger.js';
import { startMetricsServer, instrument, authDecisions } from '../../shared/metrics.js';
import { decodeJwtPayload, extractIdentity } from './jwt.js';
import { decideAuthorization } from './rules.js';
import * as authRepository from './authRepository.js';

const SERVICE = 'authorization-service';
const log = createLogger(SERVICE);

async function authorizeQuery(call, callback) {
  const { token_jwt, query_type, target_id } = call.request;

  const identity = extractIdentity(decodeJwtPayload(token_jwt));

  let decision;
  try {
    decision = await decideAuthorization(identity, { query_type, target_id }, authRepository);
  } catch (err) {
    log.error('erro ao consultar o banco na autorização', {
      error: err.message,
      username: identity.username,
      target_id,
    });
    return callback({ code: grpc.status.INTERNAL, message: 'falha ao verificar autorização' });
  }

  authDecisions.inc({
    decision: decision.status,
    role: decision.role || 'UNKNOWN',
    access_level: decision.access_level || 'NONE',
  });

  log.info('decisão de autorização', {
    username: decision.username,
    role: decision.role,
    query_type,
    target_id,
    status: decision.status,
    access_level: decision.access_level,
    reason: decision.reason,
  });

  callback(null, {
    status: decision.status,
    access_level: decision.access_level,
    username: decision.username,
    role: decision.role,
  });
}

export function buildServer() {
  const server = new grpc.Server();
  server.addService(clinicalProto.AuthorizationService.service, {
    AuthorizeQuery: instrument(SERVICE, 'AuthorizeQuery', authorizeQuery),
  });
  return server;
}

export function start() {
  const server = buildServer();
  const addr = `${config.authorization.host}:${config.authorization.port}`;
  server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      log.error('falha ao iniciar gRPC', { error: err.message });
      process.exit(1);
    }
    log.info('AuthorizationService ouvindo', { address: `${config.authorization.host}:${port}` });
  });
  startMetricsServer(SERVICE, process.env.AUTH_METRICS_PORT || 9101);
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
