import { query } from '../../db/pool.js';
import { queries } from '../../db/queries.js';

const CONDICAO_DO_PROJETO = `
  SELECT target_condition_code AS codigo_condicao
  FROM projects
  WHERE project_id = $1`;

const asText = (v) => (v === null || v === undefined ? '' : String(v));
const asDate = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : asText(v));
const asTimestamp = (v) => (v instanceof Date ? v.toISOString() : asText(v));

const toDBPatient = (r) => ({
  id_paciente: asText(r.id_paciente),
  nome: asText(r.nome),
  data_nascimento: asDate(r.data_nascimento),
  genero: asText(r.genero),
  cidade: asText(r.cidade),
  estado: asText(r.estado),
  cpf: asText(r.cpf),
  cns: asText(r.cns),
});

const toDBEncounter = (r) => ({
  id_atendimento: asText(r.id_atendimento),
  id_paciente: asText(r.id_paciente),
  data_inicio: asTimestamp(r.data_inicio),
  data_fim: asTimestamp(r.data_fim),
  tipo_atendimento: asText(r.tipo_atendimento),
  setor_departamento: asText(r.setor), 
});

const toDBClinicalEvent = (r) => ({
  id_evento: asText(r.id_evento),
  id_paciente: asText(r.id_paciente),
  id_atendimento: asText(r.id_atendimento),
  tipo_evento: asText(r.tipo_evento), 
  codigo_tipo_evento: asText(r.codigo_evento), 
  descricao_evento: asText(r.descricao_evento),
  data_evento: asDate(r.data_evento),
  valor: asText(r.valor),
  unidade_valor: asText(r.unidade_valor),
});

export async function findPatients({ username, patientId }) {
  const rows = patientId
    ? await query(queries.pacienteDoCuidador, [username, patientId])
    : await query(queries.pacientesDoCuidador, [username]);
  return rows.map(toDBPatient);
}

export async function findEncounters(patientId) {
  const rows = await query(queries.atendimentosDoPaciente, [patientId]);
  return rows.map(toDBEncounter);
}

export async function findClinicalEvents(patientId) {
  const rows = await query(queries.eventosClinicosDoPaciente, [patientId]);
  return rows.map(toDBClinicalEvent);
}

const ATENDIMENTOS_DA_COORTE = `
  SELECT e.encounter_id AS id_atendimento, e.patient_id AS id_paciente, e.start_date AS data_inicio, e.end_date AS data_fim,
         e.encounter_type AS tipo_atendimento, e.department AS setor
  FROM encounters e
  WHERE e.patient_id IN (
    SELECT DISTINCT ce.patient_id
    FROM clinical_events ce
    WHERE ce.event_type = 'CONDITION' AND ce.code = $1
  )
  LIMIT 5000`;

export async function findCohortData(projectId) {
  const projRows = await query(CONDICAO_DO_PROJETO, [projectId]);
  if (projRows.length === 0) {
    return { condition_code: '', patients: [], relevant_events: [], encounters: [] };
  }
  const conditionCode = projRows[0].codigo_condicao;

  const [patientRows, eventRows, encounterRows] = await Promise.all([
    query(queries.pacientesDaCoorte, [conditionCode]),
    query(queries.eventosDaCoorte, [conditionCode]),
    query(ATENDIMENTOS_DA_COORTE, [conditionCode]),
  ]);

  return {
    condition_code: asText(conditionCode),
    patients: patientRows.map(toDBPatient),
    relevant_events: eventRows.map(toDBClinicalEvent),
    encounters: encounterRows.map(toDBEncounter),
  };
}
