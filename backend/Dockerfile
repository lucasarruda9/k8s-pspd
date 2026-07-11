FROM node:20-alpine
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ .
COPY proto/ /proto/

EXPOSE 3000
CMD ["npm", "run", "start:all"]
