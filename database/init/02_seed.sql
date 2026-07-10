-- 02_seed.sql - Pacientes fake para desenvolvimento/teste

BEGIN;

-- pacientes
INSERT INTO patients (id_paciente, nome, data_nascimento, genero, cidade, estado, cpf, cns) VALUES
    ('P000001', 'João da Silva',     '1970-05-10', 'male',   'Brasília',   'DF', '12345678900', '700000000000001'),
    ('P000002', 'Maria Oliveira',    '1985-08-22', 'female', 'Goiânia',    'GO', '98765432111', '700000000000002'),
    ('P000003', 'Carlos Pereira',    '1958-03-14', 'male',   'Brasília',   'DF', '45678912300', '700000000000003'),
    ('P000004', 'Ana Beatriz Souza', '1992-11-02', 'female', 'Taguatinga', 'DF', '32165498700', '700000000000004'),
    ('P000005', 'Francisca Lima',    '1949-01-27', 'female', 'Ceilândia',  'DF', '65498732100', '700000000000005');

-- atendimentos
INSERT INTO encounters (id_atendimento, id_paciente, data_inicio, data_fim, tipo_atendimento, setor) VALUES
    ('E00000001', 'P000001', '2023-02-10 09:00', '2023-02-10 10:00', 'AMBULATORIAL', 'ENDOCRINOLOGIA'),
    ('E00000002', 'P000001', '2024-04-18 14:00', '2024-04-18 15:00', 'RETORNO',      'CARDIOLOGIA'),
    ('E00000003', 'P000001', '2025-09-03 08:30', '2025-09-03 09:30', 'AMBULATORIAL', 'ENDOCRINOLOGIA'),
    ('E00000004', 'P000002', '2024-06-05 10:00', '2024-06-05 11:00', 'AMBULATORIAL', 'CARDIOLOGIA'),
    ('E00000005', 'P000002', '2025-01-20 16:00', '2025-01-20 17:30', 'EMERGENCIA',   'CARDIOLOGIA'),
    ('E00000006', 'P000003', '2025-03-12 11:00', '2025-03-15 09:00', 'INTERNACAO',   'PNEUMOLOGIA'),
    ('E00000007', 'P000004', '2025-07-01 09:00', '2025-07-01 09:40', 'AMBULATORIAL', 'ENDOCRINOLOGIA'),
    ('E00000008', 'P000005', '2025-05-22 13:00', '2025-05-22 14:00', 'RETORNO',      'ENDOCRINOLOGIA');

-- eventos clínicos
INSERT INTO clinical_events (id_paciente, id_atendimento, tipo_evento, codigo_evento, descricao_evento, data_evento, valor, unidade_valor) VALUES
    ('P000001', 'E00000001', 'CONDICAO',   'DIABETES',          'Diabetes Mellitus Tipo 2',       '2023-02-10 09:30', NULL,   NULL),
    ('P000001', 'E00000001', 'MEDICACAO',  'METFORMINA',        'Metformina 850 mg 2x/dia',       '2023-02-10 09:45', 850,    'mg'),
    ('P000001', 'E00000002', 'CONDICAO',   'HIPERTENSAO',       'Hipertensão Arterial Sistêmica', '2024-04-18 14:20', NULL,   NULL),
    ('P000001', 'E00000002', 'MEDICACAO',  'LOSARTANA',         'Losartana 50 mg 1x/dia',         '2024-04-18 14:30', 50,     'mg'),
    ('P000001', 'E00000003', 'OBSERVACAO', 'GLICEMIA',          'Glicemia de jejum',              '2025-09-03 08:45', 182,    'mg/dL'),
    ('P000001', 'E00000003', 'OBSERVACAO', 'HBA1C',             'Hemoglobina glicada',            '2025-09-03 08:45', 8.1,    '%'),
    ('P000001', 'E00000003', 'OBSERVACAO', 'IMC',               'Índice de massa corporal',       '2025-09-03 08:50', 31.2,   'kg/m2'),
    ('P000001', 'E00000003', 'OBSERVACAO', 'PRESSAO_SISTOLICA', 'Pressão arterial sistólica',     '2025-09-03 08:50', 150,    'mmHg'),
    ('P000002', 'E00000004', 'CONDICAO',   'HIPERTENSAO',       'Hipertensão Arterial Sistêmica', '2024-06-05 10:20', NULL,   NULL),
    ('P000002', 'E00000004', 'MEDICACAO',  'LOSARTANA',         'Losartana 50 mg 1x/dia',         '2024-06-05 10:40', 50,     'mg'),
    ('P000002', 'E00000005', 'OBSERVACAO', 'PRESSAO_SISTOLICA', 'Pressão arterial sistólica',     '2025-01-20 16:10', 165,    'mmHg'),
    ('P000003', 'E00000006', 'CONDICAO',   'PNEUMONIA',         'Pneumonia bacteriana',           '2025-03-12 12:00', NULL,   NULL),
    ('P000003', 'E00000006', 'MEDICACAO',  'AMOXICILINA',       'Amoxicilina 500 mg 8/8h',        '2025-03-12 12:30', 500,    'mg'),
    ('P000004', 'E00000007', 'CONDICAO',   'DIABETES',          'Diabetes Mellitus Tipo 2',       '2025-07-01 09:20', NULL,   NULL),
    ('P000004', 'E00000007', 'OBSERVACAO', 'HBA1C',             'Hemoglobina glicada',            '2025-07-01 09:30', 7.2,    '%'),
    ('P000004', 'E00000007', 'OBSERVACAO', 'GLICEMIA',          'Glicemia de jejum',              '2025-07-01 09:30', 150,    'mg/dL'),
    ('P000004', 'E00000007', 'OBSERVACAO', 'IMC',               'Índice de massa corporal',       '2025-07-01 09:35', 28.4,   'kg/m2'),
    ('P000005', 'E00000008', 'CONDICAO',   'DIABETES',          'Diabetes Mellitus Tipo 2',       '2025-05-22 13:20', NULL,   NULL),
    ('P000005', 'E00000008', 'MEDICACAO',  'INSULINA_NPH',      'Insulina NPH 10 UI',             '2025-05-22 13:40', 10,     'UI');

-- vínculos
INSERT INTO user_patient_assignments (username, id_paciente, tipo_vinculo, supervisor_username, status) VALUES
    ('med.cardoso', 'P000001', 'MEDICO',     NULL,          'ATIVO'),
    ('med.cardoso', 'P000002', 'MEDICO',     NULL,          'ATIVO'),
    ('med.cardoso', 'P000004', 'MEDICO',     NULL,          'ATIVO'),
    ('med.souza',   'P000003', 'MEDICO',     NULL,          'ATIVO'),
    ('med.souza',   'P000005', 'MEDICO',     NULL,          'ATIVO'),
    ('est.silva',   'P000001', 'ESTAGIARIO', 'med.cardoso', 'ATIVO'),
    ('est.silva',   'P000002', 'ESTAGIARIO', 'med.cardoso', 'ATIVO');

-- projetos
INSERT INTO projects (id_projeto, titulo, username_pesquisador, codigo_condicao, status, data_validade) VALUES
    ('PRJ01', 'Controle glicêmico em diabéticos tipo 2',       'pesq.almeida', 'DIABETES',    'APROVADO', '2027-12-31'),
    ('PRJ02', 'Hipertensão arterial e desfechos cardiológicos','pesq.almeida', 'HIPERTENSAO', 'APROVADO', '2027-06-30');

COMMIT;
