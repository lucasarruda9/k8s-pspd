// Pré-requisitos: banco de pé + os 3 serviços rodando.
// Uso:  node scripts/e2e-local.mjs
import * as grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO = path.resolve(__dirname, '../../proto/sistema.proto');

const def = protoLoader.loadSync(PROTO, { keepCase: true });
const p = grpc.loadPackageDefinition(def).clinical_system;
const creds = grpc.credentials.createInsecure();

const auth = new p.AuthorizationService('localhost:50051', creds);
const pat = new p.PatientDataService('localhost:50052', creds);
const tr = new p.DataTransformService('localhost:50053', creds);

const call = (fn, arg) => new Promise((res, rej) => fn(arg, (e, r) => (e ? rej(e) : res(r))));
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (pl) => `${b64({ alg: 'HS256' })}.${b64(pl)}.sig`;

async function consulta(label, role, username, queryType, targetId) {
  console.log(`\n===== ${label} =====`);
  const a = await call(auth.AuthorizeQuery.bind(auth), {
    token_jwt: jwt({ preferred_username: username, role }),
    query_type: queryType,
    target_id: targetId,
  });
  console.log(`AUTH  -> ${a.status} / ${a.access_level || '-'}`);
  if (a.status !== 'ALLOW') return;

  const [pr, er, ev] = await Promise.all([
    call(pat.FetchPatients.bind(pat), { username: a.username, role: a.role, patient_id: targetId }),
    call(pat.FetchEncounters.bind(pat), { patient_id: targetId }),
    call(pat.FetchClinicalEvents.bind(pat), { patient_id: targetId }),
  ]);
  console.log(`FETCH -> ${pr.patients.length} paciente(s), ${er.encounters.length} atendimento(s), ${ev.events.length} evento(s)`);

  const f = await call(tr.TransformToFHIR.bind(tr), {
    access_level: a.access_level,
    raw_patients: pr.patients,
    raw_encounters: er.encounters,
    raw_events: ev.events,
  });
  console.log('FHIR  ->', JSON.stringify(f.patients[0]));
}

async function coorte(projectId) {
  console.log(`\n===== PESQUISADOR pesq.almeida -> estatisticas ${projectId} =====`);
  const a = await call(auth.AuthorizeQuery.bind(auth), {
    token_jwt: jwt({ preferred_username: 'pesq.almeida', role: 'pesquisador' }),
    query_type: 'ResumoCoorte',
    target_id: projectId,
  });
  console.log(`AUTH  -> ${a.status} / ${a.access_level}`);
  const s = await call(tr.GetCohortStatistics.bind(tr), { project_id: projectId });
  console.log(`STATS -> ${s.total_patients} paciente(s) | ${s.gender_distribution} | ${s.average_age}`);
}

async function main() {
  await consulta('MEDICO med.cardoso -> P000001 (espera FULL)', 'medico', 'med.cardoso', 'ResumoClinico', 'P000001');
  await consulta('MEDICO med.cardoso -> P000003 (espera DENY)', 'medico', 'med.cardoso', 'ResumoClinico', 'P000003');
  await consulta('ESTAGIARIO est.silva -> P000001 (espera PARTIAL)', 'estagiario', 'est.silva', 'ResumoClinico', 'P000001');
  await coorte('PRJ01');
  process.exit(0);
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
