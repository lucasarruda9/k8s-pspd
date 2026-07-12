export const queries = {
  medicoPodeAcessarPaciente: `
    SELECT 1
    FROM user_patient_assignments
    WHERE username = $1 AND patient_id = $2
      AND assignment_type = 'ATTENDING' AND active = true`,

  estagiarioPodeAcessarPaciente: `
    SELECT supervisor_username
    FROM user_patient_assignments
    WHERE username = $1 AND patient_id = $2
      AND assignment_type = 'TRAINEE' AND active = true`,

  pesquisadorPodeAcessarProjeto: `
    SELECT target_condition_code AS codigo_condicao
    FROM projects
    WHERE project_id = $2 AND researcher_username = $1
      AND status = 'APPROVED' AND valid_until >= CURRENT_DATE`,

  pacientesDoCuidador: `
    SELECT p.patient_id AS id_paciente, p.full_name AS nome, p.birth_date AS data_nascimento, p.gender AS genero,
           p.city AS cidade, p.state AS estado, p.cpf, p.cns
    FROM user_patient_assignments upa
    JOIN patients p ON upa.patient_id = p.patient_id
    WHERE upa.username = $1 AND upa.active = true
    ORDER BY p.full_name`,

  pacienteDoCuidador: `
    SELECT p.patient_id AS id_paciente, p.full_name AS nome, p.birth_date AS data_nascimento, p.gender AS genero,
           p.city AS cidade, p.state AS estado, p.cpf, p.cns
    FROM user_patient_assignments upa
    JOIN patients p ON upa.patient_id = p.patient_id
    WHERE upa.username = $1 AND upa.patient_id = $2 AND upa.active = true`,

  atendimentosDoPaciente: `
    SELECT encounter_id AS id_atendimento, patient_id AS id_paciente, start_date AS data_inicio, end_date AS data_fim,
           encounter_type AS tipo_atendimento, department AS setor
    FROM encounters
    WHERE patient_id = $1
    ORDER BY start_date DESC`,

  eventosClinicosDoPaciente: `
    SELECT event_id AS id_evento, patient_id AS id_paciente, encounter_id AS id_atendimento, event_type AS tipo_evento,
           code AS codigo_evento, description AS descricao_evento, event_date AS data_evento, value AS valor, unit AS unidade_valor
    FROM clinical_events
    WHERE patient_id = $1
    ORDER BY event_date DESC`,

  pacientesDaCoorte: `
    SELECT DISTINCT p.patient_id AS id_paciente, p.full_name AS nome, p.birth_date AS data_nascimento, p.gender AS genero,
           p.city AS cidade, p.state AS estado, p.cpf, p.cns
    FROM clinical_events ce
    JOIN patients p ON ce.patient_id = p.patient_id
    WHERE ce.event_type = 'CONDITION' AND ce.code = $1`,

  eventosDaCoorte: `
    SELECT ce.event_id AS id_evento, ce.patient_id AS id_paciente, ce.encounter_id AS id_atendimento, ce.event_type AS tipo_evento,
           ce.code AS codigo_evento, ce.description AS descricao_evento, ce.event_date AS data_evento,
           ce.value AS valor, ce.unit AS unidade_valor
    FROM clinical_events ce
    WHERE ce.event_type IN ('OBSERVATION', 'MEDICATION')
      AND EXISTS (
          SELECT 1 FROM clinical_events cond
          WHERE cond.patient_id = ce.patient_id
            AND cond.event_type = 'CONDITION'
            AND cond.code = $1)`,

  projetosDoPesquisador: `
    SELECT project_id AS id_projeto, title AS titulo, target_condition_code AS codigo_condicao, status, valid_until AS data_validade
    FROM projects
    WHERE researcher_username = $1
    ORDER BY project_id`,

  estatisticasDaCoorte: `
    WITH coorte AS (
        SELECT DISTINCT ce.patient_id
        FROM clinical_events ce
        WHERE ce.event_type = 'CONDITION' AND ce.code = $1
    )
    SELECT
        count(*) AS total_pacientes,
        round(100.0 * count(*) FILTER (WHERE p.gender = 'female') / count(*), 1) AS pct_feminino,
        round(100.0 * count(*) FILTER (WHERE p.gender = 'male') / count(*), 1)   AS pct_masculino,
        round(avg(extract(year FROM age(p.birth_date)))::numeric, 1)             AS media_idade
    FROM coorte
    JOIN patients p USING (patient_id)`,

  faixasEtariasDaCoorte: `
    WITH coorte AS (
        SELECT DISTINCT ce.patient_id
        FROM clinical_events ce
        WHERE ce.event_type = 'CONDITION' AND ce.code = $1
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
        SELECT extract(year FROM age(p.birth_date))::int AS idade
        FROM coorte JOIN patients p USING (patient_id)
    ) x
    GROUP BY 1
    ORDER BY 1`,

  mediaExameDaCoorte: `
    WITH coorte AS (
        SELECT DISTINCT ce.patient_id
        FROM clinical_events ce
        WHERE ce.event_type = 'CONDITION' AND ce.code = $1
    )
    SELECT
        count(*) AS total_medicoes,
        round(avg(ce.value), 2) AS media,
        round(percentile_cont(0.5) WITHIN GROUP (ORDER BY ce.value)::numeric, 2) AS mediana,
        min(ce.value) AS minimo,
        max(ce.value) AS maximo
    FROM clinical_events ce
    JOIN coorte USING (patient_id)
    WHERE ce.event_type = 'OBSERVATION' AND ce.code = $2`,

  departamentosDaCoorte: `
    WITH coorte AS (
        SELECT DISTINCT ce.patient_id
        FROM clinical_events ce
        WHERE ce.event_type = 'CONDITION' AND ce.code = $1
    )
    SELECT e.department AS setor, count(*) AS atendimentos,
           round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS percentual
    FROM encounters e
    JOIN coorte USING (patient_id)
    GROUP BY e.department
    ORDER BY atendimentos DESC`,

  medicamentosDaCoorte: `
    WITH coorte AS (
        SELECT DISTINCT ce.patient_id
        FROM clinical_events ce
        WHERE ce.event_type = 'CONDITION' AND ce.code = $1
    )
    SELECT ce.code AS medicamento,
           count(DISTINCT ce.patient_id) AS pacientes_em_uso
    FROM clinical_events ce
    JOIN coorte USING (patient_id)
    WHERE ce.event_type = 'MEDICATION'
    GROUP BY ce.code
    ORDER BY pacientes_em_uso DESC`,

  examesAnonimizadosDaCoorte: `
    WITH coorte AS (
        SELECT DISTINCT ce.patient_id
        FROM clinical_events ce
        WHERE ce.event_type = 'CONDITION' AND ce.code = $1
    ),
    ultimo_exame AS (
        SELECT DISTINCT ON (ce.patient_id, ce.code)
               ce.patient_id, ce.code, ce.value
        FROM clinical_events ce
        JOIN coorte USING (patient_id)
        WHERE ce.event_type = 'OBSERVATION'
        ORDER BY ce.patient_id, ce.code, ce.event_date DESC
    )
    SELECT
        'hash' || substr(md5(p.patient_id || 'pspd-salt'), 1, 8)  AS pseudo_id,
        CASE p.gender WHEN 'female' THEN 'F' ELSE 'M' END          AS sexo,
        extract(year FROM age(p.birth_date))::int                  AS idade,
        max(ue.value) FILTER (WHERE ue.code = 'HBA1C')             AS hba1c,
        max(ue.value) FILTER (WHERE ue.code = 'GLICEMIA')          AS glicemia,
        max(ue.value) FILTER (WHERE ue.code = 'IMC')               AS imc
    FROM coorte c
    JOIN patients p USING (patient_id)
    LEFT JOIN ultimo_exame ue USING (patient_id)
    GROUP BY p.patient_id, p.gender, p.birth_date
    ORDER BY pseudo_id`,
};
