-- consultas.sql - Catálogo de consultas de alta performance


-- A. AUTHORIZATION SERVICE (AuthorizeQuery)

-- A1. Médico pode acessar o paciente? ($1 = username, $2 = id_paciente)
--     Retorna 1 linha => ALLOW + FULL; 0 linhas => DENY.
--     Usa idx_assignments_username (index-only scan).

SELECT 1
FROM user_patient_assignments
WHERE username = $1
  AND id_paciente = $2
  AND tipo_vinculo = 'MEDICO'
  AND status = 'ATIVO';


-- A2. Estagiário pode acessar o paciente? ($1 = username, $2 = id_paciente)
--     Retorna supervisor => ALLOW + PARTIAL; 0 linhas => DENY.

SELECT supervisor_username
FROM user_patient_assignments
WHERE username = $1
  AND id_paciente = $2
  AND tipo_vinculo = 'ESTAGIARIO'
  AND status = 'ATIVO';


-- A3. Pesquisador pode acessar o projeto? ($1 = username, $2 = id_projeto)
--     Retorna a condição da coorte => ALLOW + ANONYMIZED/AGGREGATED;
--     0 linhas => DENY (projeto de outro pesquisador, expirado ou suspenso).

SELECT codigo_condicao
FROM projects
WHERE id_projeto = $2
  AND username_pesquisador = $1
  AND status = 'APROVADO'
  AND data_validade >= CURRENT_DATE;



-- B. PATIENT DATA SERVICE - consultas por cuidador

-- B1. FetchPatients: pacientes sob responsabilidade de um cuidador
--     ($1 = username do médico ou estagiário)
--     Serve tanto para MEDICO quanto ESTAGIARIO

SELECT p.id_paciente, p.nome, p.data_nascimento, p.genero,
       p.cidade, p.estado, p.cpf, p.cns
FROM user_patient_assignments upa
JOIN patients p USING (id_paciente)
WHERE upa.username = $1
  AND upa.status = 'ATIVO'
ORDER BY p.nome;


-- B2. FetchPatients com paciente específico ($1 = username, $2 = id_paciente)

SELECT p.id_paciente, p.nome, p.data_nascimento, p.genero,
       p.cidade, p.estado, p.cpf, p.cns
FROM user_patient_assignments upa
JOIN patients p USING (id_paciente)
WHERE upa.username = $1
  AND upa.id_paciente = $2
  AND upa.status = 'ATIVO';


-- C. PATIENT DATA SERVICE - histórico do paciente

-- C1. FetchEncounters: atendimentos do paciente, mais recentes primeiro
--     ($1 = id_paciente). Usa idx_encounters_paciente_data (sem sort).

SELECT id_atendimento, id_paciente, data_inicio, data_fim,
       tipo_atendimento, setor
FROM encounters
WHERE id_paciente = $1
ORDER BY data_inicio DESC;


-- C2. FetchClinicalEvents: histórico clínico completo ($1 = id_paciente)
--     Usa idx_events_paciente_data.

SELECT id_evento, id_paciente, id_atendimento, tipo_evento,
       codigo_evento, descricao_evento, data_evento, valor, unidade_valor
FROM clinical_events
WHERE id_paciente = $1
ORDER BY data_evento DESC;


-- C3. Resumo clínico ($1 = id_paciente): último atendimento, diagnósticos,
--     último resultado de cada exame e medicamentos em uso
--     DISTINCT ON + índice parcial garante busca apenas do topo de cada grupo.

(
    SELECT 'ULTIMO_ATENDIMENTO' AS secao, id_atendimento AS ref,
           tipo_atendimento AS codigo, setor AS descricao,
           data_inicio AS data, NULL::numeric AS valor, NULL AS unidade
    FROM encounters
    WHERE id_paciente = $1
    ORDER BY data_inicio DESC
    LIMIT 1
)
UNION ALL
(
    SELECT 'DIAGNOSTICO', id_atendimento, codigo_evento, descricao_evento,
           data_evento, NULL, NULL
    FROM clinical_events
    WHERE id_paciente = $1 AND tipo_evento = 'CONDICAO'
)
UNION ALL
(
    SELECT DISTINCT ON (codigo_evento)
           'ULTIMO_EXAME', id_atendimento, codigo_evento, descricao_evento,
           data_evento, valor, unidade_valor
    FROM clinical_events
    WHERE id_paciente = $1 AND tipo_evento = 'OBSERVACAO'
    ORDER BY codigo_evento, data_evento DESC
)
UNION ALL
(
    SELECT DISTINCT ON (codigo_evento)
           'MEDICAMENTO_EM_USO', id_atendimento, codigo_evento, descricao_evento,
           data_evento, valor, unidade_valor
    FROM clinical_events
    WHERE id_paciente = $1 AND tipo_evento = 'MEDICACAO'
    ORDER BY codigo_evento, data_evento DESC
);


-- D. PATIENT DATA SERVICE - coortes de pesquisa

-- D1. FetchCohortData - pacientes da coorte ($1 = codigo_condicao do projeto)
--     Usa idx_events_condicao (índice parcial: só varre linhas de CONDICAO).

SELECT DISTINCT p.id_paciente, p.nome, p.data_nascimento, p.genero,
       p.cidade, p.estado, p.cpf, p.cns
FROM clinical_events ce
JOIN patients p USING (id_paciente)
WHERE ce.tipo_evento = 'CONDICAO'
  AND ce.codigo_evento = $1;


-- D2. FetchCohortData - eventos relevantes da coorte ($1 = codigo_condicao)
--     Exames e medicações dos pacientes que possuem a condição.

SELECT ce.id_evento, ce.id_paciente, ce.id_atendimento, ce.tipo_evento,
       ce.codigo_evento, ce.descricao_evento, ce.data_evento,
       ce.valor, ce.unidade_valor
FROM clinical_events ce
WHERE ce.tipo_evento IN ('OBSERVACAO', 'MEDICACAO')
  AND EXISTS (
      SELECT 1 FROM clinical_events cond
      WHERE cond.id_paciente = ce.id_paciente
        AND cond.tipo_evento = 'CONDICAO'
        AND cond.codigo_evento = $1
  );

-- D3. Projetos de um pesquisador ($1 = username) - tela do pesquisador

SELECT id_projeto, titulo, codigo_condicao, status, data_validade
FROM projects
WHERE username_pesquisador = $1
ORDER BY id_projeto;



-- E. DATA TRANSFORM SERVICE - agregações (acesso AGGREGATED)
-- Todas parametrizadas por $1 = codigo_condicao da coorte.

-- E1. GetCohortStatistics: total, distribuição por sexo e média de idade
--     em uma única passada sobre a coorte (FILTER evita múltiplos scans).

WITH coorte AS (
    SELECT DISTINCT ce.id_paciente
    FROM clinical_events ce
    WHERE ce.tipo_evento = 'CONDICAO' AND ce.codigo_evento = $1
)
SELECT
    count(*)                                                        AS total_pacientes,
    round(100.0 * count(*) FILTER (WHERE p.genero = 'female') / count(*), 1) AS pct_feminino,
    round(100.0 * count(*) FILTER (WHERE p.genero = 'male')   / count(*), 1) AS pct_masculino,
    round(avg(extract(year FROM age(p.data_nascimento)))::numeric, 1)        AS media_idade
FROM coorte
JOIN patients p USING (id_paciente);


-- E2. Distribuição por faixa etária da coorte

WITH coorte AS (
    SELECT DISTINCT ce.id_paciente
    FROM clinical_events ce
    WHERE ce.tipo_evento = 'CONDICAO' AND ce.codigo_evento = $1
)
SELECT
    CASE
        WHEN idade < 18  THEN '0-17'
        WHEN idade < 40  THEN '18-39'
        WHEN idade < 60  THEN '40-59'
        WHEN idade < 80  THEN '60-79'
        ELSE '80+'
    END AS faixa_etaria,
    count(*) AS total,
    round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS percentual
FROM (
    SELECT extract(year FROM age(p.data_nascimento))::int AS idade
    FROM coorte JOIN patients p USING (id_paciente)
) x
GROUP BY 1
ORDER BY 1;

-- E3. Média/mediana dos exames da coorte (ex: HbA1c de diabéticos)
--     ($1 = codigo_condicao, $2 = codigo do exame, ex 'HBA1C')

WITH coorte AS (
    SELECT DISTINCT ce.id_paciente
    FROM clinical_events ce
    WHERE ce.tipo_evento = 'CONDICAO' AND ce.codigo_evento = $1
)
SELECT
    count(*)                                              AS total_medicoes,
    round(avg(ce.valor), 2)                               AS media,
    round(percentile_cont(0.5) WITHIN GROUP (ORDER BY ce.valor)::numeric, 2) AS mediana,
    min(ce.valor)                                         AS minimo,
    max(ce.valor)                                         AS maximo
FROM clinical_events ce
JOIN coorte USING (id_paciente)
WHERE ce.tipo_evento = 'OBSERVACAO'
  AND ce.codigo_evento = $2;

-- E4. Departamentos mais usados pela coorte

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
ORDER BY atendimentos DESC;

-- E5. Frequência de utilização de medicamentos na coorte

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
ORDER BY pacientes_em_uso DESC;


-- F. DATA TRANSFORM SERVICE - exames anonimizados (acesso ANONYMIZED)

-- F1. Exames por paciente com pseudonimização ($1 = codigo_condicao)
--     * id real substituído por hash (md5 truncado, estável entre chamadas)
--     * idade em anos (não expõe data de nascimento exata)
--     * último valor de cada exame pivotado em colunas, como no exemplo da
--       especificação: hash001 | F | 63 | HbA1c=8.1 | glicemia=182 | IMC=31.2

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
    'hash' || substr(md5(p.id_paciente || 'pspd-salt'), 1, 8)   AS pseudo_id,
    CASE p.genero WHEN 'female' THEN 'F' ELSE 'M' END           AS sexo,
    extract(year FROM age(p.data_nascimento))::int              AS idade,
    max(ue.valor) FILTER (WHERE ue.codigo_evento = 'HBA1C')     AS hba1c,
    max(ue.valor) FILTER (WHERE ue.codigo_evento = 'GLICEMIA')  AS glicemia,
    max(ue.valor) FILTER (WHERE ue.codigo_evento = 'IMC')       AS imc
FROM coorte c
JOIN patients p USING (id_paciente)
LEFT JOIN ultimo_exame ue USING (id_paciente)
GROUP BY p.id_paciente, p.genero, p.data_nascimento
ORDER BY pseudo_id;
