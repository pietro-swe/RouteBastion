# Architecture Overview
> RouteBastion — VRP brokering middleware as a pnpm monorepo

pnpm workspaces. Globs in `pnpm-workspace.yaml`: `apps/*`, `packages/*`.
Note: shared contracts actually live at `apps/packages/contracts` (matched by `apps/*`); root `packages/` is empty.

Three apps (`apps/`):
- **admin-api** — NestJS (Fastify) + Drizzle. Admin/back-office control plane. See [[admin-api-patterns]]
- **admin-ui** — Vue 3 + PrimeVue admin panel. Skeletal. See [[admin-ui-skeleton]]
- **broker** — Go (Gin) + sqlc. Runtime VRP broker engine. See [[broker-architecture]]
- **packages/contracts** — Zod schemas/types shared admin-ui ↔ admin-api. Planned, empty (created by admin-users-crud spec).

Relationship:
- admin-api + admin-ui = management plane (configure customers, providers, vehicles, constraints, users).
- broker = runtime engine that solves VRP via external providers.
- Both model the SAME Postgres domain — broker via sqlc (`sql/schema.sql`), admin-api via Drizzle tables. See [[domain-model]]

Infra: Docker + Docker Compose, `k8s/`, Kong gateway (broker `config/kong/`).
Tooling: Biome (root `lint`/`format`), Husky + lint-staged. Root `package.json` runs everything via `pnpm -r`.
Feature specs live in `.specs/features/<name>/` (spec.md / design.md / tasks.md). `docs/` is for human+AI docs (currently empty).

Updated: 2026-06-15
