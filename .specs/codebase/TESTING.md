# Testing Strategy

**Analyzed:** 2026-05-03

## Current Test Tooling

- `apps/admin-api`
  - Unit/integration runner: `pnpm test` → `vitest run`
  - Build gate: `pnpm build`
- `apps/admin-ui`
  - Unit/component runner: `pnpm test:unit`
  - Type/build gate: `pnpm build`

## Coverage Matrix

| Area | Expected Test Type | Reason |
| ---- | ------------------ | ------ |
| Shared package contracts | none | Type-check and downstream consumption are the primary gate |
| `admin-api` pure auth services/helpers | unit | Business rules and token/session decisions are isolated here |
| `admin-api` auth controller/cookie flow | integration | Endpoint, cookie, and guard behavior should be verified without introducing a full e2e layer yet |
| `admin-ui` auth store/router/session bootstrap | unit | Current UI test setup is component/jsdom based |

## Gate Commands

### Quick Gate

- Shared package: `pnpm --filter <package> build` or workspace type-check once package exists
- `admin-api`: `pnpm --filter admin-api test`
- `admin-ui`: `pnpm --filter admin-ui test:unit`

### Full Gate

- `pnpm --filter admin-api build`
- `pnpm --filter admin-api test`
- `pnpm --filter admin-ui build`
- `pnpm --filter admin-ui test:unit`

## Parallelism Assessment

| Test Type | Parallel-Safe | Notes |
| --------- | ------------- | ----- |
| none | Yes | Type-only or build-only changes can run independently if files do not overlap |
| unit | Yes | Current Vitest unit flows are isolated enough for parallel work |
| integration | No | Auth cookie/session behavior still touches shared app startup and environment wiring |

## Auth Feature Notes

- Backend auth endpoint tasks that change cookies, app bootstrap, or env wiring should not be marked `[P]`.
- Shared contract package work can run before API/UI integration and is safe to parallelize once package naming is fixed.
- The existing UI test suite is minimal, so auth store/router tasks should co-locate the first meaningful unit coverage.
- Do not add e2e tests for this feature yet; backend endpoint verification should stay at the integration-test layer for now.
