import * as grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { PROTO_PATH } from '../config.js';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, 
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

export const clinicalProto =
  grpc.loadPackageDefinition(packageDefinition).clinical_system;

export { grpc };
