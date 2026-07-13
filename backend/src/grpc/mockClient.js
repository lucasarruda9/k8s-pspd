const MOCK_PATIENTS_MEDICO = [
  {
    id_paciente: 'pac-001',
    nome: 'João da Silva',
    data_nascimento: '1970-05-10',
    genero: 'M',
    cidade: 'Brasília',
    estado: 'DF',
    cpf: '12345678900',
    cns: '123456789012345',
  },
  {
    id_paciente: 'pac-002',
    nome: 'Maria Oliveira',
    data_nascimento: '1985-08-22',
    genero: 'F',
    cidade: 'Goiânia',
    estado: 'GO',
    cpf: '98765432111',
    cns: '987654321098765',
  },
  {
    id_paciente: 'pac-003',
    nome: 'Carlos Pereira',
    data_nascimento: '1960-03-15',
    genero: 'M',
    cidade: 'Belo Horizonte',
    estado: 'MG',
    cpf: '11122233344',
    cns: '111222333445566',
  },
];

function formatPatientsForRole(role) {
  switch (role?.toUpperCase()) {
    case 'MEDICO':
      return MOCK_PATIENTS_MEDICO.map(p => ({
        id: p.id_paciente,
        nomeCompleto: p.nome,
        cpf: p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
        nascimento: p.data_nascimento.split('-').reverse().join('/'),
        diagnostico: p.id_paciente === 'pac-001' ? 'Diabetes Tipo 2'
          : p.id_paciente === 'pac-002' ? 'Hipertensão'
          : 'Insuficiência Cardíaca',
      }));
    case 'ESTAGIARIO':
      return MOCK_PATIENTS_MEDICO.map((p, i) => ({
        id: p.id_paciente,
        iniciais: p.nome.split(' ').map(n => n[0] + '.').join(' '),
        idade: `${2026 - parseInt(p.data_nascimento.slice(0, 4))} anos`,
        sexo: p.genero === 'M' ? 'Masculino' : 'Feminino',
        diagnostico: i === 0 ? 'Diabetes Tipo 2' : i === 1 ? 'Hipertensão' : 'Insuficiência Cardíaca',
      }));
    default:
      return [];
  }
}

const MOCK_STATISTICS = {
  totalPacientes: 14000,
  distribuicaoSexo: '70% M | 30% F',
  mediaIdadeDiabetes: '61.5 anos',
  // campos extras usados pelo proto
  total_patients: 14000,
  gender_distribution: '70% M | 30% F',
  average_age: '61.5 anos',
  age_ranges: [
    { range: '18-30', percentage: 5.0 },
    { range: '31-45', percentage: 15.0 },
    { range: '46-60', percentage: 35.0 },
    { range: '61-75', percentage: 38.0 },
    { range: '76+',   percentage: 7.0 },
  ],
  departments: [
    { department_name: 'Endocrinologia', percentage: 45.0 },
    { department_name: 'Cardiologia',    percentage: 30.0 },
    { department_name: 'Nefrologia',     percentage: 25.0 },
  ],
  medications: [
    { medication_name: 'Metformina',  count: 8500 },
    { medication_name: 'Insulina',    count: 6200 },
    { medication_name: 'Losartana',   count: 4100 },
  ],
  sample_exams: [
    { pseudo_id: 'hash-001', age: 63, gender: 'F', hba1c: '8.1%', glicemia: '182 mg/dL', imc: '31.2' },
    { pseudo_id: 'hash-002', age: 58, gender: 'M', hba1c: '7.2%', glicemia: '150 mg/dL', imc: '28.4' },
    { pseudo_id: 'hash-003', age: 71, gender: 'F', hba1c: '9.0%', glicemia: '210 mg/dL', imc: '33.1' },
    { pseudo_id: 'hash-004', age: 55, gender: 'M', hba1c: '6.8%', glicemia: '130 mg/dL', imc: '26.7' },
  ],
};

const MOCK_AMOSTRAS = MOCK_STATISTICS.sample_exams.map(e => ({
  id: e.pseudo_id,
  idade: e.age,
  sexo: e.gender,
  hba1c: e.hba1c,
  glicemia: e.glicemia,
  imc: e.imc,
}));

const MOCK_COHORT = {
  condition_code: 'Diabetes',
  patients: MOCK_PATIENTS_MEDICO,
  relevant_events: [
    {
      id_evento: '1',
      id_paciente: 'pac-001',
      tipo_evento: 'OBSERVACAO',
      codigo_tipo_evento: 'HbA1c',
      descricao_evento: 'Hemoglobina Glicada',
      data_evento: '2026-01-15',
      valor: '8.1',
      unidade_valor: '%',
    },
  ],
};

function buildFHIRResponse(req) {
  const level = req.access_level || 'FULL';
  const patients = (req.raw_patients || []).map((p, i) => ({
    resource_type: 'Patient',
    id: level === 'FULL' ? p.id_paciente : `hash-${i + 1}`,
    name: level === 'FULL' ? p.nome : (p.nome || '').split(' ').map(n => n[0] + '.').join(' '),
    birth_date: level === 'ANONYMIZED' ? '' : p.data_nascimento,
    gender: p.genero || '',
    city: level === 'ANONYMIZED' ? '' : p.cidade || '',
    state: p.estado || '',
    cpf: level === 'FULL' ? p.cpf : '',
    cns: level === 'FULL' ? p.cns : '',
  }));
  return { patients, encounters: [], conditions: [], observations: [], medications: [] };
}

import { authDecisions } from '../shared/metrics.js';

export const mockGrpcClient = {
  AuthorizeQuery: async ({ token_jwt, query_type }) => {
    authDecisions.inc({ decision: 'ALLOW', role: 'MEDICO', access_level: 'FULL' });
    return {
      status: 'ALLOW',
      access_level: 'FULL',
      username: 'mock-user',
      role: 'MEDICO',
    };
  },

  FetchPatients: async ({ role }) => ({
    patients: formatPatientsForRole(role),
  }),

  FetchEncounters: async ({ patient_id }) => ({
    encounters: [
      {
        id_atendimento: 'enc-001',
        id_paciente: patient_id,
        data_inicio: '2026-01-10T09:00:00Z',
        data_fim:    '2026-01-10T10:30:00Z',
        tipo_atendimento: 'Consulta',
        setor_departamento: 'Endocrinologia',
      },
    ],
  }),

  FetchClinicalEvents: async ({ patient_id }) => ({
    events: [
      {
        id_evento: '1',
        id_paciente: patient_id,
        tipo_evento: 'OBSERVACAO',
        codigo_tipo_evento: 'HbA1c',
        descricao_evento: 'Hemoglobina Glicada',
        data_evento: '2026-01-15T08:00:00Z',
        valor: '8.1',
        unidade_valor: '%',
      },
      {
        id_evento: '2',
        id_paciente: patient_id,
        tipo_evento: 'MEDICACAO',
        codigo_tipo_evento: 'Metformina',
        descricao_evento: 'Metformina 850mg',
        data_evento: '2026-01-15T08:00:00Z',
        valor: '850',
        unidade_valor: 'mg',
      },
    ],
  }),

  FetchCohortData: async ({ project_id }) => MOCK_COHORT,

  TransformToFHIR: async (req) => buildFHIRResponse(req),

  GetCohortStatistics: async ({ project_id }) => MOCK_STATISTICS,
};
