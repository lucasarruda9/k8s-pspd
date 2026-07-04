/** Tem que verificar se esse vai ser o padrão de dados msm */
export const dadosDoMedico = [
  {
    id: 1,
    nomeCompleto: 'João da Silva',
    cpf: '123.456.789-00',
    nascimento: '10/05/1970',
    diagnostico: 'Diabetes Tipo 2',
  },
  {
    id: 2,
    nomeCompleto: 'Maria Oliveira',
    cpf: '987.654.321-11',
    nascimento: '22/08/1985',
    diagnostico: 'Hipertensão',
  },
];

/** perfil ESTAGIARIO (PARTIAL). */
export const dadosDoEstagiario = [
  { id: 1, iniciais: 'J. S.', idade: '56 anos', sexo: 'Masculino', diagnostico: 'Diabetes Tipo 2' },
  { id: 2, iniciais: 'M. O.', idade: '40 anos', sexo: 'Feminino', diagnostico: 'Hipertensão' },
];

/** perfil PESQUISADOR (AGGREGATED). */
export const estatisticasDoPesquisador = {
  totalPacientes: '14.000',
  distribuicaoSexo: '70% M | 30% H',
  mediaIdadeDiabetes: '61.5 anos',
};

/** exames anonimizados para o perfil PESQUISADOR. */
export const amostrasAnonimizadas = [
  { id: 'hash001', idade: 63, sexo: 'F', hba1c: 8.1, glicemia: 182, imc: 31.2 },
  { id: 'hash002', idade: 58, sexo: 'M', hba1c: 7.2, glicemia: 150, imc: 28.4 },
];

export function getDadosPorPerfil(role) {
  switch (role) {
    case 'MEDICO':
      return { tipo: 'medico', pacientes: dadosDoMedico };
    case 'ESTAGIARIO':
      return { tipo: 'estagiario', pacientes: dadosDoEstagiario };
    case 'PESQUISADOR':
      return {
        tipo: 'pesquisador',
        estatisticas: estatisticasDoPesquisador,
        amostras: amostrasAnonimizadas,
      };
    default:
      return null;
  }
}
