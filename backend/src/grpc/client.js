import { clinicalProto, grpc } from './loader.js';
import { config } from '../config.js';

function getHost(envVar, defaultHost) {
  if (process.env[envVar]) {
    return process.env[envVar].replace('http://', '').replace('https://', '');
  }
  return defaultHost;
}

const authClient = new clinicalProto.AuthorizationService(
  getHost('AUTH_SERVICE_URL', `127.0.0.1:${config.authorization.port}`),
  grpc.credentials.createInsecure()
);

const patientClient = new clinicalProto.PatientDataService(
  getHost('PATIENT_DATA_SERVICE_URL', `127.0.0.1:${config.patientData.port}`),
  grpc.credentials.createInsecure()
);

const transformClient = new clinicalProto.DataTransformService(
  process.env.DATA_TRANSFORM_HOST || 'data-transform:50053',
  grpc.credentials.createInsecure()
);

const promisify = (client, method) => (req) => {
  return new Promise((resolve, reject) => {
    client[method](req, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
};

export const grpcClient = {
  AuthorizeQuery: promisify(authClient, 'AuthorizeQuery'),
  FetchPatients: promisify(patientClient, 'FetchPatients'),
  FetchEncounters: promisify(patientClient, 'FetchEncounters'),
  FetchClinicalEvents: promisify(patientClient, 'FetchClinicalEvents'),
  FetchCohortData: promisify(patientClient, 'FetchCohortData'),
  TransformToFHIR: promisify(transformClient, 'TransformToFHIR'),
  GetCohortStatistics: promisify(transformClient, 'GetCohortStatistics'),
};
