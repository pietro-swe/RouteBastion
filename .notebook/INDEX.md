# .notebook
> Project intelligence — read before every mission

Last updated: 2026-06-15

- [architecture-overview](architecture-overview.md) — Monorepo: admin-api + admin-ui + broker + contracts | flow | monorepo, structure
- [domain-model](domain-model.md) — VRP domain shared across broker (sqlc) + admin-api (drizzle) | domain | vrp, postgres, schema
- [admin-api-patterns](admin-api-patterns.md) — NestJS: abstract-repo DI, Result tuples, nestjs-zod | pattern | nestjs, drizzle, conventions
- [broker-architecture](broker-architecture.md) — Go/Gin, sqlc, handler→service→store, functional DI, WIP | pattern | go, gin, sqlc, layered
- [admin-ui-skeleton](admin-ui-skeleton.md) — Vue3+PrimeVue, mostly unwired (empty router/store) | pattern | vue, primevue, skeleton
- [drizzle-schema-not-wired](drizzle-schema-not-wired.md) — db.query.* fails: drizzle() called without schema | gotcha | drizzle, admin-api, bug
