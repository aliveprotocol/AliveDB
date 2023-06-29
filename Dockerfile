FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV ALIVEDB_DATA_DIR=/app/data
ENV ALIVEDB_HTTP_PORT=3006
ENV ALIVEDB_GUN_PORT=3007
EXPOSE ${ALIVEDB_HTTP_PORT}
EXPOSE ${ALIVEDB_GUN_PORT}

CMD ["node", "src/index.js"]