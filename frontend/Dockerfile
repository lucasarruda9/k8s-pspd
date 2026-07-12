# Estágio 1: Build da aplicação React/Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências
COPY package.json package-lock.json* ./
RUN npm ci

ARG VITE_AUTH_MOCK=false
ARG VITE_API_GATEWAY_URL=/grupo4/api
ARG VITE_KEYCLOAK_URL=https://kiriland.unb.br/keycloak
ARG VITE_KEYCLOAK_REALM=grupo04
ARG VITE_KEYCLOAK_CLIENT_ID=frontend-client

ENV VITE_AUTH_MOCK=$VITE_AUTH_MOCK
ENV VITE_API_GATEWAY_URL=$VITE_API_GATEWAY_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID

# Copia código e realiza o build de produção
COPY . .
RUN npm run build

# Estágio 2: Servidor Web Nginx (Alta performance para K8s)
FROM nginx:alpine

# Copia configuração customizada do Nginx para suportar navegação SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos estáticos gerados no estágio de build
COPY --from=builder /app/dist /usr/share/nginx/html

# Expõe a porta 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
