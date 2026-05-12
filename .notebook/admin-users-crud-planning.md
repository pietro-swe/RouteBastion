# Admin Users CRUD Planning

**Date**: 2026-05-12

## Findings

- The feature spec is at `.specs/features/admin-users-crud/spec.md` and already includes decisions for physical deletion, status enum, pending first password, cursor pagination, and `/users` route.
- `apps/admin-api/src/modules/users` already has create/delete endpoints, service methods, repository abstraction, and Drizzle repository.
- Current API create input still requires `password`; the feature requires removing password generation/input and persisting pending first password state instead.
- Current `users` table has no `status`, `statusModifiedAt`, or `isPasswordCreationPending`; `passwordHash` is currently non-null.
- `admin-ui` is minimal: router has constants only, no actual routes, and the auth store is empty.
- `apps/packages/contracts` does not exist. The workspace currently includes `apps/*` and `packages/*`, so a nested `apps/packages/contracts` package needs workspace wiring if the spec path is preserved.
- `apps/admin-api/package.json` has `test:e2e` pointing to `vitest.config.e2e.ts`, while the repo file is `vitest.e2e.config.ts`.

## Planning Artifacts

- `.specs/codebase/TESTING.md`
- `.specs/features/admin-users-crud/design.md`
- `.specs/features/admin-users-crud/tasks.md`

