# Testing Strategy

**Status**: Draft
**Last updated**: 2026-05-12

---

## Test Commands

| Scope | Command | Notes |
| --- | --- | --- |
| Repository lint | `pnpm lint` | Runs Biome checks for the whole repository. |
| Repository build | `pnpm build` | Runs recursive package builds. |
| Admin API unit | `pnpm --filter admin-api test` | Vitest config at `apps/admin-api/vitest.config.ts`. |
| Admin API coverage | `pnpm --filter admin-api test:cov` | Required for the feature coverage target. |
| Admin API e2e/integration | `pnpm --filter admin-api test:e2e` | Script currently points to `vitest.config.e2e.ts`, while the file in the repo is `vitest.e2e.config.ts`; implementation should correct this before relying on the gate. |
| Admin UI unit/component | `pnpm --filter admin-ui test:unit -- --run` | Vitest + jsdom config at `apps/admin-ui/vitest.config.ts`. |
| Admin UI type-check | `pnpm --filter admin-ui type-check` | Vue type checking. |
| Admin UI build | `pnpm --filter admin-ui build` | Includes type-check and Vite build. |

---

## Coverage Matrix

| Code Layer | Required Test Type | Parallel-Safe | Gate |
| --- | --- | --- | --- |
| Shared contracts | Unit/type coverage via package build | Yes | `pnpm --filter @route-bastion/contracts build` |
| Admin API service/business rules | Unit | Yes | `pnpm --filter admin-api test` |
| Admin API repository/persistence | Integration/e2e | No | `pnpm --filter admin-api test:e2e` |
| Admin API HTTP controller | Integration/e2e | No | `pnpm --filter admin-api test:e2e` |
| Admin UI service/client | Unit | Yes | `pnpm --filter admin-ui test:unit -- --run` |
| Admin UI store | Unit | Yes | `pnpm --filter admin-ui test:unit -- --run` |
| Admin UI views/components | Component/unit | Yes | `pnpm --filter admin-ui test:unit -- --run` |
| Repository formatting/linting | Static check | Yes | `pnpm lint` |

---

## Feature Gate

Before marking `admin-users-crud` done, run:

1. `pnpm --filter @route-bastion/contracts build`
2. `pnpm --filter admin-api test`
3. `pnpm --filter admin-api test:e2e`
4. `pnpm --filter admin-api test:cov`
5. `pnpm --filter admin-ui test:unit -- --run`
6. `pnpm --filter admin-ui build`
7. `pnpm lint`

