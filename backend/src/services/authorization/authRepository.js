import { query } from '../../db/pool.js';
import { queries } from '../../db/queries.js';

export async function isPatientLinkedToDoctor(username, patientId) {
  const rows = await query(queries.medicoPodeAcessarPaciente, [username, patientId]);
  return rows.length > 0;
}

export async function isPatientSupervisedByIntern(username, patientId) {
  const rows = await query(queries.estagiarioPodeAcessarPaciente, [username, patientId]);
  return rows.length > 0 && !!rows[0].supervisor_username;
}

export async function getValidResearchProject(username, projectId) {
  const rows = await query(queries.pesquisadorPodeAcessarProjeto, [username, projectId]);
  if (rows.length === 0) return null;
  return { id_projeto: projectId, codigo_condicao: rows[0].codigo_condicao };
}
