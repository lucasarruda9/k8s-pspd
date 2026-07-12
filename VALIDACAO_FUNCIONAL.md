# Validação Funcional

Este documento detalha a validação da atividade 3.a, comprovando o funcionamento da aplicação com uma réplica de cada serviço e um banco PostgreSQL. O foco é validar a autenticação, anonimização e a conversão de dados HL7 para o padrão FHIR.

## 1. Objetivos da Validação
Demonstrar os três comportamentos exigidos pelo sistema:
1. **Autorização:** Cada perfil (Médico, Estagiário, Pesquisador) recebe permissão ou bloqueio conforme seu vínculo e nível de acesso.
2. **Anonimização:** Dados sensíveis (CPF, CNS, nomes reais) são removidos ou mascarados conforme o nível de acesso.
3. **Conversão FHIR:** Dados brutos do banco são transformados em recursos FHIR (Patient, Encounter, Condition, Observation, MedicationRequest).

## 2. Ambiente e Fluxo de Dados
A arquitetura utiliza serviços em Node.js (Authorization e PatientData) e Go (DataTransform), comunicando-se via gRPC.

| Componente | Tecnologia | Porta |
|---|---|---|
| Authorization | Node.js / gRPC | 50051 |
| PatientData | Node.js / gRPC | 50052 |
| DataTransform | Go / gRPC | 50053 |
| Banco | PostgreSQL 16 | 5433 |

**Fluxo de consulta:**
AuthorizeQuery (decide nível) → Fetch (Postgres) → TransformToFHIR (aplica mascaramento).

## 3. Casos de Teste (CT)

Resumo dos cenários de validação funcional aplicados ao sistema:

| ID | Perfil | Cenário | Resultado Esperado |
|---|---|---|---|
| CT-01 | Médico | Acesso a paciente vinculado | ALLOW / FULL (Dados completos) |
| CT-02 | Médico | Acesso a paciente não vinculado | DENY |
| CT-03 | Estagiário | Acesso a paciente sob supervisão | ALLOW / PARTIAL (Mascarado) |
| CT-04 | Estagiário | Acesso fora da supervisão | DENY |
| CT-05 | Pesquisador | Estatísticas de coorte (aprovado) | ALLOW / AGGREGATED |
| CT-06 | Pesquisador | Exames por paciente | ALLOW / ANONYMIZED |
| CT-07 | Pesquisador | Projeto inexistente ou alheio | DENY |
| CT-08 | Qualquer | Token com role inválida | DENY |
| CT-09 | Sistema | Transformação de eventos | Conversão correta (FHIR) |

## 4. Como Executar os Testes

### Pré-condições
Suba o banco e os serviços localmente:

# 1. Banco de dados
```bash
docker compose up -d db
```

# 2. Serviços Node (Authorization e PatientData)
```bash
cd backend
DB_HOST=localhost DB_PORT=5433 DB_NAME=hospital_db DB_USER=hospital DB_PASSWORD=hospital123 node src/start-all.js
```

# 3. Serviço Go (DataTransform)
```bash
cd ../data-transform-go
PATIENT_DATA_ADDR=localhost:50052 go run ./cmd/server
```

### Testes Automatizados

# Testes de lógica e integração
```bash
cd backend && npm test
cd data-transform-go && go test -race ./...
```

# Validação funcional integrada (Cenários CT-01, 02, 03 e 05)
```bash
node backend/scripts/e2e-local.mjs
```

## 5. Resultados e Evidências

| Caso | Perfil | Resultado | Observação |
|---|---|---|---|
| CT-01 | Médico | ALLOW / FULL | Nome, CPF, CNS e nascimento completos. |
| CT-02 | Médico | DENY | Acesso bloqueado corretamente. |
| CT-03 | Estagiário | ALLOW / PARTIAL | Nome reduzido (iniciais), sem CPF/CNS. |
| CT-05 | Pesquisador | ALLOW / AGGREGATED | Dados agregados (estatísticas da coorte). |

A validação confirma que o sistema respeita rigorosamente os níveis de acesso: Médico (FULL), Estagiário (PARTIAL) e Pesquisador (ANONYMIZED/AGGREGATED). O sistema está apto para os testes de carga e escalabilidade.