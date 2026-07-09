/**
 * Catálogo de consultas SQL do banco PatientData.
 */

export const queries = {

  // ===== Authorization Service =====

  /** $1 = username do médico, $2 = id_paciente. 1 linha => ALLOW+FULL. */
  medicoPodeAcessarPaciente: `
    SELECT 1
    FROM user_patient_assignments
    WHERE username = $1 AND id_paciente = $2
      AND tipo_vinculo = 'MEDICO' AND status = 'ATIVO'`,

  /** $1 = username do estagiário, $2 = id_paciente. 1 linha => ALLOW+PARTIAL. */
  estagiarioPodeAcessarPaciente: `
    SELECT supervisor_username
    FROM user_patient_assignments
    WHERE username = $1 AND id_paciente = $2
      AND tipo_vinculo = 'ESTAGIARIO' AND status = 'ATIVO'`,

  /** $1 = username do pesquisador, $2 = id_projeto. 1 linha => ALLOW. */
  pesquisadorPodeAcessarProjeto: `
    SELECT codigo_condicao
    FROM projects
    WHERE id_projeto = $2 AND username_pesquisador = $1
      AND status = 'APROVADO' AND data_validade >= CURRENT_DATE`,

  // ===== Patient Data Service =====

  /** $1 = username do cuidador (médico ou estagiário). */
  pacientesDoCuidador: `
    SELECT p.id_paciente, p.nome, p.data_nascimento, p.genero,
           p.cidade, p.estado, p.cpf, p.cns
    FROM user_patient_assignments upa
    JOIN patients p USING (id_paciente)
    WHERE upa.username = $1 AND upa.status = 'ATIVO'
    ORDER BY p.nome`,

  /** $1 = username, $2 = id_paciente. */
  pacienteDoCuidador: `
    SELECT p.id_paciente, p.nome, p.data_nascimento, p.genero,
           p.cidade, p.estado, p.cpf, p.cns
    FROM user_patient_assignments upa
    JOIN patients p USING (id_paciente)
    WHERE upa.username = $1 AND upa.id_paciente = $2 AND upa.status = 'ATIVO'`,

  /** $1 = id_paciente. */
  atendimentosDoPaciente: `
    SELECT id_atendimento, id_paciente, data_inicio, data_fim,
           tipo_atendimento, setor
    FROM encounters
    WHERE id_paciente = $1
    ORDER BY data_inicio DESC`,

  /** $1 = id_paciente. */
  eventosClinicosDoPaciente: `
    SELECT id_evento, id_paciente, id_atendimento, tipo_evento,
           codigo_evento, descricao_evento, data_evento, valor, unidade_valor
    FROM clinical_events
    WHERE id_paciente = $1
    ORDER BY data_evento DESC`,

  /** $1 = codigo_condicao. Pacientes da coorte. */
  pacientesDaCoorte: `
    SELECT DISTINCT p.id_paciente, p.nome, p.data_nascimento, p.genero,
           p.cidade, p.estado, p.cpf, p.cns
    FROM clinical_events ce
    JOIN patients p USING (id_paciente)
    WHERE ce.tipo_evento = 'CONDICAO' AND ce.codigo_evento = $1`,

  /** $1 = codigo_condicao. Exames e medicações dos pacientes da coorte. */
  eventosDaCoorte: `
    SELECT ce.id_evento, ce.id_paciente, ce.id_atendimento, ce.tipo_evento,
           ce.codigo_evento, ce.descricao_evento, ce.data_evento,
           ce.valor, ce.unidade_valor
    FROM clinical_events ce
    WHERE ce.tipo_evento IN ('OBSERVACAO', 'MEDICACAO')
      AND EXISTS (
          SELECT 1 FROM clinical_events cond
          WHERE cond.id_paciente = ce.id_paciente
            AND cond.tipo_evento = 'CONDICAO'
            AND cond.codigo_evento = $1)`,

  /** $1 = username do pesquisador. */
  projetosDoPesquisador: `
    SELECT id_projeto, titulo, codigo_condicao, status, data_validade
    FROM projects
    WHERE username_pesquisador = $1
    ORDER BY id_projeto`,

  // ===== Data Transform Service =====
  /** $1 = codigo_condicao. Total, distribuição por sexo e média de idade. */
  estatisticasDaCoorte: `
    WITH coorte AS (
        SELECT DISTINCT ce.id_paciente
        FROM clinical_events ce
        WHERE ce.tipo_evento = 'CONDICAO' AND ce.codigo_evento = $1
    )
    SELECT
        count(*) AS total_pacientes,
        round(100.0 * count(*) FILTER (WHERE p.genero = 'female') / count(*), 1) AS pct_feminino,
        round(100.0 * count(*) FILTER (WHERE p.genero = 'male') / count(*), 1)   AS pct_masculino,
        round(avg(extract(year FROM age(p.data_nascimento)))::numeric, 1)        AS media_idade
    FROM coorte
    JOIN patients p USING (id_paciente)`,

  /** $1 = codigo_condicao. Distribuição por faixa etária. */
  faixasEtariasDaCoorte: `
    WITH coorte AS (
        SELECT DISTINCT ce.id_paciente
        FROM clinical_events ce
        WHERE ce.tipo_evento = 'CONDICAO' AND ce.codigo_evento = $1
    )
    SELECT
        CASE
            WHEN idade < 18 THEN '0-17'
            WHEN idade < 40 THEN '18-39'
            WHEN idade < 60 THEN '40-59'
            WHEN idade < 80 THEN '60-79'
            ELSE '80+'
        END AS faixa_etaria,
        count(*) AS total,
        round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS percentual
    FROM (
        SELECT extract(year FROM age(p.data_nascimento))::int AS idade
        FROM coorte JOIN patients p USING (id_paciente)
    ) x
    GROUP BY 1
    ORDER BY 1`,

  /**
   * $1 = codigo_condicao, $2 = codigo do exame (ex: 'HBA1C').
   * Média, mediana e extremos de um exame na coorte
   * (ex: média da hemoglobina glicada dos diabéticos).
   */
  mediaExameDaCoorte: `
    WITH coorte AS (
        SELECT DISTINCT ce.id_paciente
        FROM clinical_events ce
        WHERE ce.tipo_evento = 'CONDICAO' AND ce.codigo_evento = $1
    )
    SELECT
        count(*) AS total_medicoes,
        round(avg(ce.valor), 2) AS media,
        round(percentile_cont(0.5) WITHIN GROUP (ORDER BY ce.valor)::numeric, 2) AS mediana,
        min(ce.valor) AS minimo,
        max(ce.valor) AS maximo
    FROM clinical_events ce
    JOIN coorte USING (id_paciente)
    WHERE ce.tipo_evento = 'OBSERVACAO' AND ce.codigo_evento = $2`,

  /** $1 = codigo_condicao. Departamentos mais usados pela coorte. */
  departamentosDaCoorte: `
    WITH coorte AS (
        SELECT DISTINCT ce.id_paciente
        FROM clinical_events ce
        WHERE ce.tipo_evento = 'CONDICAO' AND ce.codigo_evento = $1
    )
    SELECT e.setor, count(*) AS atendimentos,
           round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS percentual
    FROM encounters e
    JOIN coorte USING (id_paciente)
    GROUP BY e.setor
    ORDER BY atendimentos DESC`,

  /** $1 = codigo_condicao. Frequência de medicamentos na coorte. */
  medicamentosDaCoorte: `
    WITH coorte AS (
        SELECT DISTINCT ce.id_paciente
        FROM clinical_events ce
        WHERE ce.tipo_evento = 'CONDICAO' AND ce.codigo_evento = $1
    )
    SELECT ce.codigo_evento AS medicamento,
           count(DISTINCT ce.id_paciente) AS pacientes_em_uso
    FROM clinical_events ce
    JOIN coorte USING (id_paciente)
    WHERE ce.tipo_evento = 'MEDICACAO'
    GROUP BY ce.codigo_evento
    ORDER BY pacientes_em_uso DESC`,

  /** $1 = codigo_condicao. Exames anonimizados (pseudo_id, sexo, idade, exames). */
  examesAnonimizadosDaCoorte: `
    WITH coorte AS (
        SELECT DISTINCT ce.id_paciente
        FROM clinical_events ce
        WHERE ce.tipo_evento = 'CONDICAO' AND ce.codigo_evento = $1
    ),
    ultimo_exame AS (
        SELECT DISTINCT ON (ce.id_paciente, ce.codigo_evento)
               ce.id_paciente, ce.codigo_evento, ce.valor
        FROM clinical_events ce
        JOIN coorte USING (id_paciente)
        WHERE ce.tipo_evento = 'OBSERVACAO'
        ORDER BY ce.id_paciente, ce.codigo_evento, ce.data_evento DESC
    )
    SELECT
        'hash' || substr(md5(p.id_paciente || 'pspd-salt'), 1, 8)  AS pseudo_id,
        CASE p.genero WHEN 'female' THEN 'F' ELSE 'M' END          AS sexo,
        extract(year FROM age(p.data_nascimento))::int             AS idade,
        max(ue.valor) FILTER (WHERE ue.codigo_evento = 'HBA1C')    AS hba1c,
        max(ue.valor) FILTER (WHERE ue.codigo_evento = 'GLICEMIA') AS glicemia,
        max(ue.valor) FILTER (WHERE ue.codigo_evento = 'IMC')      AS imc
    FROM coorte c
    JOIN patients p USING (id_paciente)
    LEFT JOIN ultimo_exame ue USING (id_paciente)
    GROUP BY p.id_paciente, p.genero, p.data_nascimento
    ORDER BY pseudo_id`,
};
