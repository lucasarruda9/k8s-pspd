# Sistema de Monitoramento de Informações Clínicas (PSPD)

Projeto desenvolvido para a disciplina de Programação para Sistemas Paralelos e Distribuídos (PSPD). O foco deste projeto é construir uma aplicação conteinerizada baseada em microsserviços e operá-la em um cluster Kubernetes, garantindo observabilidade e monitoramento.

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

#### Deploy

Execute os comandos abaixo em sequencia, no mesmo terminal:

```bash
kubectl apply -f k8s/base/ --kubeconfig=.kube/kubeconfig-grupo-4.yaml
kubectl apply -f k8s/services/ --kubeconfig=.kube/kubeconfig-grupo-4.yaml
kubectl apply -f k8s/observability/ --kubeconfig=.kube/kubeconfig-grupo-4.yaml
```

#### Verificacao

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

| Versao | Descricao | Autor(es) | Data | Revisor(es) | Data de Revisao |
|---|---|---|---|---|---|
| 1.0 | Estrutura inicial do README | [João Pedro Cota](https://github.com/johnaopedro) | 10/07/2026 | [João Pedro Cota](https://github.com/johnaopedro) | 10/07/2026 |
| 1.1 | Adiciona instrucoes de deploy Kubernetes | [Artur Mendonca Arruda](https://github.com/ArtyMend07) | 10/07/2026 | [Artur Mendonca Arruda](https://github.com/ArtyMend07) | 10/07/2026 |
