import './tracer.js';

import { start as startAuth } from './services/authorization/server.js';
import { start as startPatient } from './services/patientData/server.js';
import { createLogger } from './shared/logger.js';

const log = createLogger('backend');
log.info('iniciando microsserviços Node (Authorization + PatientData)');

startAuth();
startPatient();
