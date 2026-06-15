# RouteBastion Monolith

This repository contains the monolith for RouteBastion application.

RouteBastion is an intelligent middleware for enterprise solutions, providing access to multiple Vehicle Routing Problems (VRP) solution providers via broker algorithm.

## Repo Structure

- `.husky`: Husky configurations
- `.vscode`: VsCode configurations
- `apps`: Applications source code
- `docs`: Documentation for humans and AI
- `k8s`: Kubernetes configurations

## Applications

- `admin-api`: API providing Admin. functionality for managing configuration and customers from the `broker` application
- `admin-ui`: UI that consumes the `admin-ui`
- `broker`: providing the broker algorithm
- `packages`: Packages with contracts, types, etc. that can be shared between applications

## Tech. Stack

- `admin-api`: TS + NestJS (Fastify), Drizzle ORM, Vitest, Zod, Supertest
- `admin-ui`: TS + Vue.js 3, PrimeVue + PrimeIcons + PrimeVue Forms, VueUse, Vue Router, Pinia, ky, TailwindCSS, Zod, Vitest
- `broker`: Go, sqlc
- Infra.: Docker + Docker Compose, Kubernetes
- Other: pnpm
