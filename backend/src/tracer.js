/**
 * Instrumentação OpenTelemetry para o API Gateway (Node.js/Fastify)
 * 
 * DEVE ser importado ANTES de qualquer outro módulo da aplicação.
 * Propaga o contexto de rastreamento (W3C TraceContext) para as chamadas
 * gRPC internas, fechando o trace end-to-end:
 *   Browser → API Gateway → AuthorizationService → PatientDataService
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const OTLP_URL = process.env.OTLP_COLLECTOR_URL;

const exporter = OTLP_URL
  ? new OTLPTraceExporter({ url: `${OTLP_URL}/v1/traces` })
  : new ConsoleSpanExporter();

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: 'api-gateway',
    [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: exporter,
  // Instrumenta automaticamente: HTTP, gRPC, PostgreSQL, Express/Fastify, etc.
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // muito verboso
    }),
  ],
});

sdk.start();
console.log(`[OTel] Rastreamento iniciado → ${OTLP_URL ? 'Jaeger OTLP (' + OTLP_URL + ')' : 'Console (dev)'}`);

// Garante shutdown limpo ao encerrar o processo
process.on('SIGTERM', () => sdk.shutdown());
process.on('SIGINT',  () => sdk.shutdown());
