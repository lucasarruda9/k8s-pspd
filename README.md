# Sistema de Monitoramento de Informações Clínicas (PSPD)

**Universidade de Brasília — FCTE — Engenharia de Software** <br>
**Disciplina: PSPD — Programação para Sistemas Paralelos e Distribuídos** <br>
**Professor: Fernando W. Cruz**

Projeto desenvolvido para a disciplina de Programação para Sistemas Paralelos e Distribuídos (PSPD). O foco deste projeto é construir uma aplicação conteinerizada baseada em microsserviços e operá-la em um cluster Kubernetes, garantindo observabilidade e monitoramento.


### Grupo

| Integrante | Matrícula | Foco de Trabalho |
|---|---|---|
| Artur Mendonça Arruda | 231033737 | Infraestrutura, Kubernetes, Monitoramento e Testes de Carga |
| Ester Flores Lino da Silva | 202063201 | Microsserviços, Transformação FHIR e Validação Funcional |
| João Pedro Costa | 190030801 | Frontend, Autenticação OIDC/Keycloak e Interfaces por Perfil |
| Lucas Mendonça Arruda | 231035464 | API Gateway, Validação JWT, Roteamento e Integração gRPC |
| Lucas Guimarães Borges | 222015159 | Modelagem SQL, Banco de Dados e Queries de Performance |


## Sobre o projeto

Este projeto é um sistema de monitoramento clínico com microsserviços integrados.

- `frontend`: front-end React/Vite que faz login no Keycloak e consome o API Gateway.
- `API Gateway`: camada HTTP no backend que recebe as requisições do frontend e encaminha para os serviços gRPC.
- `Authorization`: serviço gRPC em js que valida acesso com base em vínculos de usuário, paciente e projetos.
- `PatientData`: serviço gRPC em js que consulta dados de pacientes, atendimentos e eventos clínicos.
- `DataTransform`: serviço gRPC em Go que transforma dados em formato FHIR e calcula estatísticas.
- `db PatientData`: banco PostgreSQL com schema e seeds para pacientes, projetos, vínculos e consultas.

## Pré-requisitos

- `Docker` e `Docker Compose` para rodar o ambiente local.
- `kubectl` para deploy em Kubernetes.
- `kubeconfig` correto em `.kube/kubeconfig-grupo-4.yaml` para o cluster remoto.
- `Node.js` e `npm` para rodar o frontend localmente.
- `Keycloak` para autenticação OIDC do frontend.

## Estrutura do Projeto

- `/frontend`: Aplicação cliente (React/Vite).
- `/backend`: Microsserviços gRPC (Authorization, PatientData, DataTransform).
- `/proto`: Contrato gRPC compartilhado (`sistema.proto`).
- `/database`: Modelagem PostgreSQL, seeds e consultas otimizadas.

## Padrões de Qualidade e Organização

Este repositório está configurado na raiz com ferramentas padrão de qualidade exigidas em bons projetos de software:

- `.gitignore`: Impede que arquivos pesados ou sensíveis sejam commitados no repositório.
- `docker-compose.yml`: Arquivo base de orquestração local, preparando o terreno para a conteinerização massiva e uso do Kubernetes.

## Como Rodar

### 1. Via Docker

Primeiro, crie o arquivo de variáveis de ambiente a partir do exemplo versionado e ajuste as credenciais se necessário:

```bash
cp .env.example .env
```

Em seguida, suba toda a infraestrutura disponível com um único comando:

```bash
docker-compose up --build
```

O Frontend estará disponível em `http://localhost`.

### 2. Via Kubernetes (Cluster Remoto)

#### Pre-requisitos

- `kubectl` instalado na maquina local.
- Arquivo `kubeconfig` do cluster colocado em `.kube/kubeconfig-grupo-4.yaml` na raiz do projeto.

#### Configuracao de Secrets

Antes do deploy, edite o arquivo `k8s/base/secrets.yaml` e preencha as credenciais reais do banco de dados e do JWT:

```yaml
stringData:
  jwt-secret: "<sua-chave-jwt>"
  postgres-user: "<usuario-do-banco>"
  postgres-password: "<senha-do-banco>"
  postgres-db: "<nome-do-banco>"
  postgres-host: "<ip-do-host-postgres>"
```

> Nunca commite esse arquivo com credenciais reais. Use `git update-index --assume-unchanged k8s/base/secrets.yaml` para impedir que o Git rastreie alteracoes locais.

#### Deploy Oficial (Cluster da UnB)

Execute os comandos abaixo na sequência:

```bash
kubectl apply -f k8s/base/ --kubeconfig=.kube/kubeconfig-grupo-4.yaml
kubectl apply -f k8s/services/ --kubeconfig=.kube/kubeconfig-grupo-4.yaml
```

> **Aviso:** As pastas `k8s/observability/` e `k8s/local-dev/` NÃO devem ser aplicadas no cluster da disciplina, pois o professor já fornece o Keycloak, Prometheus e Grafana centralizados.



#### Verificação

```bash
kubectl get pods -n grupo-4 --kubeconfig=.kube/kubeconfig-grupo-4.yaml
```

Todos os pods devem apresentar status `Running`.

#### Remocao completa

Para derrubar todos os recursos do namespace:

```bash
kubectl delete all --all -n grupo-4 --kubeconfig=.kube/kubeconfig-grupo-4.yaml
```

### 3. Via Node.js Tradicional

Caso deseje rodar especificamente o Frontend na sua maquina fisica:

```bash
cd frontend
npm install
npm run dev
```

### 4. Modo Mock (sem Keycloak client ID)

Caso o Keycloak do cluster não possua um client ID configurado para o frontend, o sistema pode operar em modo mock, substituindo a autenticação OAuth2 por um formulário local com seleção de papel.

#### Desenvolvimento local

```bash
# backend/.env
JWT_MOCK=true

VITE_AUTH_MOCK=true
VITE_API_GATEWAY_URL=http://localhost:3000/api
```

```bash
# Terminal 1
cd backend && node src/server.js

# Terminal 2
cd frontend && npm run dev
```

#### Deploy no cluster (modo mock)

**1. Build das imagens com mock ativo:**

```bash
# Build local
./scripts/build-mock.sh

# Build + push para o DockerHub
./scripts/build-mock.sh --push --tag=latest-mock
```

**2. Atualizar as imagens nos manifests do k8s:**

```bash
# Opção A: atualizar via kubectl set image
KUBE="--kubeconfig=.kube/kubeconfig-grupo-4.yaml"
kubectl set image deployment/frontend   frontend=artmendy/frontend:latest-mock   -n grupo-4 $KUBE
kubectl set image deployment/api-gateway api-gateway=artmendy/api-gateway:latest-mock -n grupo-4 $KUBE

# Opção B: editar frontend.yaml e api-gateway.yaml com a nova tag e aplicar normalmente
kubectl apply -f k8s/services/ $KUBE
```

> O `JWT_MOCK=true` já está configurado no `k8s/services/api-gateway.yaml`.
> O `VITE_AUTH_MOCK=true` é injetado no build via `--build-arg` pelo script `build-mock.sh`.

#### Endpoints do modo mock

| Endpoint | Descrição |
|---|---|
| `POST /api/auth/mock-login` | Gera token JWT HS256 local |
| `GET  /api/patients` | Retorna lista mock (varia por papel) |
| `GET  /api/patients/statistics/:id` | Estatísticas mock para pesquisador |
| `GET  /api/patients/cohorts/:id` | Coorte mock |
| `POST /api/transform/transform-fhir` | Transformação FHIR mock |

## Validação Funcional

Para garantir que o sistema atende aos requisitos de autenticação, anonimização e interoperabilidade (FHIR), documentamos todos os procedimentos, resultados e a matriz de conformidade no apêndice técnico do projeto.

- [Acessar Apêndice: Roteiro de Validação Funcional](VALIDACAO_FUNCIONAL.md)

## Testes de Performance e Estresse

Para validar a escalabilidade e o comportamento do sistema sob alta demanda, utilizamos o k6 para simular cargas de trabalho.

### Execução de Carga
Você pode executar o teste de estresse via Docker apontando para o seu gateway (local ou remoto):

```bash
docker run --rm -i -e GATEWAY_URL="[http://kiriland.unb.br/grupo4/api](http://kiriland.unb.br/grupo4/api)" -v "${PWD}:/app" grafana/k6 run /app/load-tests/k6-stress-test.js
```

> Nota: A variável GATEWAY_URL deve ser ajustada conforme o ambiente alvo. O script simula múltiplos usuários simultâneos disparando requisições contra os serviços.

| Versao | Descricao | Autor(es) | Data | Revisor(es) | Data de Revisao |
|---|---|---|---|---|---|
| 1.0 | Estrutura inicial do README | [João Pedro Cota](https://github.com/johnaopedro) | 10/07/2026 | [João Pedro Cota](https://github.com/johnaopedro) | 10/07/2026 |
| 1.1 | Adiciona instrucoes de deploy Kubernetes | [Artur Mendonca Arruda](https://github.com/ArtyMend07) | 10/07/2026 | [Artur Mendonca Arruda](https://github.com/ArtyMend07) | 10/07/2026 |
| 1.2 | Refatora arquitetura para uso de OAUTH2 e Observabilidade centralizada | [Artur Mendonca Arruda](https://github.com/ArtyMend07) | 10/07/2026 | [Artur Mendonca Arruda](https://github.com/ArtyMend07) | 10/07/2026 |
| 1.3 | Adiciona modo mock de autenticacao para dev local e deploy sem client ID | [João Pedro Cota](https://github.com/johnaopedro) | 12/07/2026 | [João Pedro Cota](https://github.com/johnaopedro) | 12/07/2026 |
| 1.4 | Adiciona seção de Validação funcional, Testes de performance e estresse, Execução de carga com k6 e organiza introdução | [Lucas Mendonca Arruda](https://github.com/lucasarruda9) | 12/07/2026 | [Lucas Mendonca Arruda](https://github.com/lucasarruda9) | 12/07/2026 |
