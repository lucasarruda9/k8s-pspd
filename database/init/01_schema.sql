-- PSPD 2026.1 - Sistema de Informações Clínicas (HL7/FHIR)
-- 01_schema.sql - Modelagem das tabelas do pseudo-prontuário eletrônico


-- patients: cadastro dos pacientes

CREATE TABLE patients (
    id_paciente      VARCHAR(64)  PRIMARY KEY,        
    nome             TEXT         NOT NULL,
    data_nascimento  DATE         NOT NULL,
    genero           VARCHAR(10)  NOT NULL,
    cidade           TEXT         NOT NULL,
    estado           CHAR(2)      NOT NULL,
    cpf              CHAR(11)     NOT NULL UNIQUE,       
    cns              CHAR(15)     NOT NULL UNIQUE        
);


-- encounters: atendimentos (consultas, internações, emergências...)

CREATE TABLE encounters (
    id_atendimento    VARCHAR(64) PRIMARY KEY,   
    id_paciente       VARCHAR(64) NOT NULL REFERENCES patients (id_paciente),
    data_inicio       TIMESTAMP   NOT NULL,
    data_fim          TIMESTAMP,
    tipo_atendimento  VARCHAR(20) NOT NULL,               
    setor             VARCHAR(30) NOT NULL               
);


-- clinical_events: eventos clínicos (condições, observações/exames, medicações)
--   * tipo_evento = CONDICAO   -> valor/unidade nulos
--   * tipo_evento = OBSERVACAO -> valor numérico do exame + unidade
--   * tipo_evento = MEDICACAO  -> valor = dose (opcional em dados FHIR reais)
--   * id_atendimento é opcional: recursos FHIR podem vir sem referência a
--     Encounter

CREATE TABLE clinical_events (
    id_evento        BIGSERIAL   PRIMARY KEY,
    id_paciente      VARCHAR(64) NOT NULL REFERENCES patients (id_paciente),
    id_atendimento   VARCHAR(64) REFERENCES encounters (id_atendimento),
    tipo_evento      VARCHAR(12) NOT NULL,                
    codigo_evento    VARCHAR(40) NOT NULL,               
    descricao_evento TEXT        NOT NULL,
    data_evento      TIMESTAMP   NOT NULL,
    valor            NUMERIC(10, 2),
    unidade_valor    VARCHAR(15)
);


-- user_patient_assignments: vínculo cuidador (médico/estagiário) <-> paciente
--   * estagiários sempre possuem supervisor_username (o médico supervisor)

CREATE TABLE user_patient_assignments (
    id_vinculo          SERIAL      PRIMARY KEY,
    username            VARCHAR(50) NOT NULL,            
    id_paciente         VARCHAR(64) NOT NULL REFERENCES patients (id_paciente),
    tipo_vinculo        VARCHAR(12) NOT NULL,            
    supervisor_username VARCHAR(50),                     
    status              VARCHAR(10) NOT NULL,            
    UNIQUE (username, id_paciente)
);


-- projects: projetos de pesquisa (coortes)

CREATE TABLE projects (
    id_projeto           VARCHAR(10) PRIMARY KEY,        
    titulo               TEXT        NOT NULL,
    username_pesquisador VARCHAR(50) NOT NULL,
    codigo_condicao      VARCHAR(40) NOT NULL,
    status               VARCHAR(12) NOT NULL,          
    data_validade        DATE        NOT NULL
);


-- Índices de performance 

-- Histórico de atendimentos de um paciente, do mais recente ao mais antigo
CREATE INDEX idx_encounters_paciente_data
    ON encounters (id_paciente, data_inicio DESC);

-- Histórico clínico de um paciente ordenado por data
CREATE INDEX idx_events_paciente_data
    ON clinical_events (id_paciente, data_evento DESC);

-- Coortes: "todos os pacientes com condição X" - índice parcial só de condições
CREATE INDEX idx_events_condicao
    ON clinical_events (codigo_evento, id_paciente)
    WHERE tipo_evento = 'CONDICAO';

-- Último exame de cada tipo por paciente (resumo clínico / exames anonimizados)
CREATE INDEX idx_events_observacao
    ON clinical_events (id_paciente, codigo_evento, data_evento DESC)
    WHERE tipo_evento = 'OBSERVACAO';

-- Frequência de medicamentos (agregações do pesquisador)
CREATE INDEX idx_events_medicacao
    ON clinical_events (codigo_evento)
    WHERE tipo_evento = 'MEDICACAO';

-- Lista de pacientes de um cuidador (médico ou estagiário) com vínculo ativo
CREATE INDEX idx_assignments_username
    ON user_patient_assignments (username, status);

-- Checagem inversa de autorização: quem cuida deste paciente?
CREATE INDEX idx_assignments_paciente
    ON user_patient_assignments (id_paciente, status);

-- Projetos de um pesquisador
CREATE INDEX idx_projects_pesquisador
    ON projects (username_pesquisador);
