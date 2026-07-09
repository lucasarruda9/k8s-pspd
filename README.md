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

### 2. Via Node.js Tradicional

Caso deseje rodar especificamente o Frontend na sua máquina física:

```bash
cd frontend
npm install
npm run dev
```
