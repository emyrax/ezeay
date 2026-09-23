FROM node:22-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY server/package.json server/package-lock.json server/
RUN npm ci --prefix server

COPY . .

ENV NODE_ENV=production

EXPOSE 8080
CMD ["npx", "tsx", "server/index.ts"]