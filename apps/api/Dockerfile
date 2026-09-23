FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY prisma ./prisma
RUN npx prisma generate

COPY nest-cli.json tsconfig.json ./
COPY src ./src
RUN npm run build && test -f dist/main.js

COPY docker-entrypoint.sh db-init.sh ./
RUN chmod +x ./docker-entrypoint.sh ./db-init.sh

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["./docker-entrypoint.sh"]
