#usa uma imagem NodeJs leve como base
FROM node:20-alpine

#define o diretorio de trabalho dentro do conteiner
WORKDIR /app

#copia os arquivos de configuracao de dependencias
COPY package.json package-lock.json* ./

#instala as dependencias do projeto
RUN npm install

#copia o restante do codigo fonte
COPY . .

#expoe a porta padrao que o Vite utiliza
EXPOSE 5173

#comando para iniciar o servidor de desenvolvimento e expor para a rede
CMD ["npm", "run", "dev", "--", "--host"]
