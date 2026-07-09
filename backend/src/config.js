import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PROTO_PATH =
  process.env.PROTO_PATH || path.resolve(__dirname, '../../proto/sistema.proto');

export const config = {
  authorization: {
    host: process.env.AUTH_HOST || '0.0.0.0',
    port: process.env.AUTH_PORT || '50051',
  },
  patientData: {
    host: process.env.PATIENT_HOST || '0.0.0.0',
    port: process.env.PATIENT_PORT || '50052',
  },
  dataTransform: {
    host: process.env.TRANSFORM_HOST || '0.0.0.0',
    port: process.env.TRANSFORM_PORT || '50053',
  },
  metricsPort: process.env.METRICS_PORT || '9101',
  logLevel: process.env.LOG_LEVEL || 'info',
};
