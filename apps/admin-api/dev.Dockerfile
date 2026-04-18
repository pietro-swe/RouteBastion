FROM node:25-alpine

WORKDIR /app

COPY pnpm-lock.yaml ./
RUN corepack enable && pnpm install

CMD ["pnpm", "start:dev"]
