FROM node:22.16.0

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate


EXPOSE 4040

CMD ["node", "src/swagger.js"]