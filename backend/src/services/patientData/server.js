import { clinicalProto, grpc } from '../../grpc/loader.js';
import { config } from '../../config.js';
import { createLogger } from '../../shared/logger.js';
import { startMetricsServer, instrument } from '../../shared/metrics.js';
import * as repo from './repository.js';

const SERVICE = 'patient-data-service';
const log = createLogger(SERVICE);

function handle(name, fn) {
  return async (call, callback) => {
    try {
      const response = await fn(call.request);
      callback(null, response);
    } catch (err) {
      log.error(`erro em ${name}`, { error: err.message });
      callback({ code: grpc.status.INTERNAL, message: `falha ao consultar o banco em ${name}` });
    }
  };
}

const fetchPatients = handle('FetchPatients', async ({ username, role, patient_id }) => {
  const patients = await repo.findPatients({ username, patientId: patient_id });
  log.info('FetchPatients', { username, role, patient_id, count: patients.length });
  return { patients };
});

const fetchEncounters = handle('FetchEncounters', async ({ patient_id }) => {
  const encounters = await repo.findEncounters(patient_id);
  log.info('FetchEncounters', { patient_id, count: encounters.length });
  return { encounters };
});

const fetchClinicalEvents = handle('FetchClinicalEvents', async ({ patient_id }) => {
  const events = await repo.findClinicalEvents(patient_id);
  log.info('FetchClinicalEvents', { patient_id, count: events.length });
  return { events };
});

const fetchCohortData = handle('FetchCohortData', async ({ project_id }) => {
  const cohort = await repo.findCohortData(project_id);
  log.info('FetchCohortData', {
    project_id,
    condition_code: cohort.condition_code,
    patients: cohort.patients.length,
  });
  return cohort;
});

export function buildServer() {
  const server = new grpc.Server();
  server.addService(clinicalProto.PatientDataService.service, {
    FetchPatients: instrument(SERVICE, 'FetchPatients', fetchPatients),
    FetchEncounters: instrument(SERVICE, 'FetchEncounters', fetchEncounters),
    FetchClinicalEvents: instrument(SERVICE, 'FetchClinicalEvents', fetchClinicalEvents),
    FetchCohortData: instrument(SERVICE, 'FetchCohortData', fetchCohortData),
  });
  return server;
}

export function start() {
  const server = buildServer();
  const addr = `${config.patientData.host}:${config.patientData.port}`;
  server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      log.error('falha ao iniciar gRPC', { error: err.message });
      process.exit(1);
    }
    log.info('PatientDataService ouvindo', { address: `${config.patientData.host}:${port}` });
  });
  startMetricsServer(SERVICE, process.env.PATIENT_METRICS_PORT || 9102);
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
