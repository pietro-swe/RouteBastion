FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat && npm install -g pnpm

COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

COPY apps/admin-api/.env apps/admin-api/
COPY apps/admin-api/package.json apps/admin-api/

RUN pnpm install --filter ./apps/admin-api...

WORKDIR /app/apps/admin-api

EXPOSE 3000 9229

CMD ["pnpm", "start:debug"]
