FROM node:22.16.0

WORKDIR /app

COPY package*.json ./

RUN npm ci 

COPY src/ ./src/

ENV NODE_ENV=production
ENV MAX_RETRIES=3

CMD ["node", "src/consumer.js"]