FROM node:22-alpine

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/src ./src

COPY proto /app/proto
ENV PROTO_PATH=/app/proto/sistema.proto

CMD ["node", "src/start-all.js"]
