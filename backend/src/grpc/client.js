import { clinicalProto, grpc } from './loader.js';
import { config } from '../config.js';

const authClient = new clinicalProto.AuthorizationService(
  `127.0.0.1:${config.authorization.port}`,
  grpc.credentials.createInsecure()
);

const patientClient = new clinicalProto.PatientDataService(
  `127.0.0.1:${config.patientData.port}`,
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
