import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { trace } from '@opentelemetry/api';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';

const INICIADO_CHAVE = '__TELEMETRIA_INICIADA__';

export const inicializarRastreamento = () => {
  if (window[INICIADO_CHAVE]) {
    return;
  }
  //imprime os rastros no Console do Navegador
  //troque para OTLPTraceExporter quando o Gateway com Jaeger estiver pronto
  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [SEMRESATTRS_SERVICE_NAME]: 'frontend-react-app',
      [SEMRESATTRS_SERVICE_VERSION]: '0.0.0',
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: 'development'
    }),
    spanProcessors: [
      new SimpleSpanProcessor(new ConsoleSpanExporter())
    ]
  });

  //inicia o contexto usando Zone.js para rastrear chamadas assíncronas no browser
  provider.register({
    contextManager: new ZoneContextManager(),
  });

  //registra as instrumentações automáticas para chamadas HTTP
  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        clearTimingResources: true,
      }),
      new XMLHttpRequestInstrumentation(),
    ],
  });

  window[INICIADO_CHAVE] = true;
  console.log('OpenTelemetry Rastreamento Distribuído Iniciado!');
};

export const getTracer = () => {
  return trace.getTracer('frontend-react-app');
};