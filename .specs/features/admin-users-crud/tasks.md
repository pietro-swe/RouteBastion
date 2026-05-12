# CRUD de Usuarios Administradores - Tasks

**Design**: `.specs/features/admin-users-crud/design.md`
**Status**: Draft

---

## Execution Plan

### Phase 1: Foundation

```text
T1 -> T2 -> T3
```

### Phase 2: Backend Core

```text
T3 -> T4 -> T5 -> T6 -> T7
```

### Phase 3: Frontend Core

```text
T3 -> T8 -> T9 -> T10 -> T11 -> T12
```

### Phase 4: Integration and Gates

```text
T7 + T12 -> T13
```

---

## Task Breakdown

### T1: Create shared contracts package

**What**: Create `apps/packages/contracts` with package metadata, TypeScript build config, Zod schemas, exported types, and workspace wiring.
**Where**: `apps/packages/contracts`, `pnpm-workspace.yaml`
**Depends on**: None
**Reuses**: Zod schema style from `apps/admin-api/src/modules/users/inputs/create.ts`
**Requirement**: ADM-USR-07

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [ ] Package is included in the pnpm workspace.
- [ ] User status, admin user, create, update, status update, list query, cursor page, and error schemas are exported.
- [ ] Package builds successfully.

**Tests**: type/build coverage
**Gate**: `pnpm --filter @route-bastion/contracts build`

---

### T2: Add user schema migration fields

**What**: Add user status enum and columns for nullable password hash, status, status modified date, and password creation pending flag.
**Where**: `apps/admin-api/src/modules/infra/database/drizzle/enums/enums.ts`, `apps/admin-api/src/modules/infra/database/drizzle/tables/users.ts`, `apps/admin-api/drizzle`
**Depends on**: T1
**Reuses**: Existing Drizzle enum/table/migration structure
**Requirement**: ADM-USR-03, ADM-USR-05

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [ ] Drizzle table type represents `passwordHash: string | null`.
- [ ] `status` supports `ACTIVE` and `BLOCKED`.
- [ ] `statusModifiedAt` and `isPasswordCreationPending` are persisted.
- [ ] Migration and snapshot are updated.

**Tests**: integration
**Gate**: `pnpm --filter admin-api test:e2e`

---

### T3: Replace API DTOs with shared contracts

**What**: Update users input/output DTOs to derive from shared contract schemas and remove `password` from create input.
**Where**: `apps/admin-api/src/modules/users/inputs`, `apps/admin-api/src/modules/users/outputs`, package dependencies/config as needed
**Depends on**: T1, T2
**Reuses**: Existing `createZodDto` pattern
**Requirement**: ADM-USR-03, ADM-USR-07

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [ ] API create input no longer accepts `password`.
- [ ] API outputs include `status`, `statusModifiedAt`, and `isPasswordCreationPending`.
- [ ] DTO schemas are imported from the shared contracts package.

**Tests**: unit/type
**Gate**: `pnpm --filter admin-api test`

---

### T4: Expand users repository operations

**What**: Add list/search cursor query, email uniqueness excluding current user, update, status update, and revised create behavior.
**Where**: `apps/admin-api/src/modules/users/users.repository.ts`, `apps/admin-api/src/modules/infra/database/drizzle/repositories/drizzle-users.repository.ts`
**Depends on**: T3
**Reuses**: Existing Drizzle repository injection
**Requirement**: ADM-USR-01, ADM-USR-02, ADM-USR-03, ADM-USR-04, ADM-USR-05, ADM-USR-06

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [ ] List returns 10 users ordered by `createdAt DESC` with deterministic cursor.
- [ ] Search uses case-insensitive `LIKE` by `name`.
- [ ] Create writes `passwordHash: null` and `isPasswordCreationPending: true`.
- [ ] Update supports editable fields and email reset side effects.
- [ ] Status update writes `status` and `statusModifiedAt`.
- [ ] Physical delete remains supported.
- [ ] Repository integration tests cover persistence behavior.

**Tests**: integration
**Gate**: `pnpm --filter admin-api test:e2e`

---

### T5: Implement users service business rules

**What**: Implement service methods for list, create, update, block, unblock, and delete with business-rule errors and output mapping.
**Where**: `apps/admin-api/src/modules/users/users.service.ts`
**Depends on**: T4
**Reuses**: Existing `Result` tuple style and custom exceptions
**Requirement**: ADM-USR-01, ADM-USR-02, ADM-USR-03, ADM-USR-04, ADM-USR-05, ADM-USR-06

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [ ] Duplicate email is rejected on create and update.
- [ ] Missing users are rejected on update, status update, and delete.
- [ ] Email changes reset password state.
- [ ] Name/birth date-only edits preserve password state.
- [ ] Unit tests cover each business rule.

**Tests**: unit
**Gate**: `pnpm --filter admin-api test`

---

### T6: Expose users HTTP endpoints

**What**: Add list, update, status update, and revised create/delete HTTP contracts with consistent status codes and error bodies.
**Where**: `apps/admin-api/src/modules/users/users.controller.ts`
**Depends on**: T5
**Reuses**: Existing NestJS controller response/error style
**Requirement**: ADM-USR-01, ADM-USR-02, ADM-USR-03, ADM-USR-04, ADM-USR-05, ADM-USR-06, ADM-USR-07

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [ ] `GET /users` accepts normalized search and cursor query.
- [ ] `POST /users` creates without password.
- [ ] `PATCH /users/:id` edits name, email, and birthDate.
- [ ] `PATCH /users/:id/status` blocks/unblocks.
- [ ] `DELETE /users/:id` physically deletes.
- [ ] HTTP integration tests cover success, duplicate email, missing user, empty result, and cursor pagination.

**Tests**: integration
**Gate**: `pnpm --filter admin-api test:e2e`

---

### T7: Fix and run Admin API gates

**What**: Ensure API test scripts/configs are aligned, then run backend unit, e2e, coverage, and build gates.
**Where**: `apps/admin-api/package.json`, `apps/admin-api/vitest.e2e.config.ts`, API test files
**Depends on**: T6
**Reuses**: Existing Vitest configs
**Requirement**: ADM-USR-08

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [ ] `test:e2e` points to the actual e2e Vitest config.
- [ ] API tests pass.
- [ ] API coverage for changed backend scope is at least 80%.
- [ ] API build passes.

**Tests**: unit/integration/coverage
**Gate**: `pnpm --filter admin-api test && pnpm --filter admin-api test:e2e && pnpm --filter admin-api test:cov && pnpm --filter admin-api build`

---

### T8: Create Admin UI users API service

**What**: Add a typed users API client that normalizes search input and validates payloads with shared contracts.
**Where**: `apps/admin-ui/src/features/users/services/users.service.ts`
**Depends on**: T3
**Reuses**: Existing `ky` dependency and shared contracts package
**Requirement**: ADM-USR-01, ADM-USR-02, ADM-USR-03, ADM-USR-04, ADM-USR-05, ADM-USR-06, ADM-USR-07

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [ ] Service methods exist for list, create, update, block, unblock, and delete.
- [ ] Search term is trimmed/normalized before requests.
- [ ] Unit tests cover request URLs, payloads, and error propagation.

**Tests**: unit
**Gate**: `pnpm --filter admin-ui test:unit -- --run`

---

### T9: Create Admin UI users store

**What**: Add Pinia state/actions for users list, cursor history, filters, loading states, modal workflows, and mutations after successful actions.
**Where**: `apps/admin-ui/src/features/users/stores/users.store.ts`
**Depends on**: T8
**Reuses**: Existing Pinia setup
**Requirement**: ADM-USR-01, ADM-USR-02, ADM-USR-03, ADM-USR-04, ADM-USR-05, ADM-USR-06, ADM-USR-09

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [ ] Store can load first page and next page by cursor.
- [ ] Store refreshes from page one when search changes.
- [ ] Store exposes create, update, block, unblock, and delete actions.
- [ ] Store preserves form data on action failures.
- [ ] Store tests cover pagination, search reset, success mutations, and failures.

**Tests**: unit
**Gate**: `pnpm --filter admin-ui test:unit -- --run`

---

### T10: Build users table and form modals

**What**: Create reusable UI components for the users table, create/edit modal, and delete confirmation modal.
**Where**: `apps/admin-ui/src/features/users/components`
**Depends on**: T9
**Reuses**: PrimeVue components and Tailwind setup
**Requirement**: ADM-USR-01, ADM-USR-03, ADM-USR-04, ADM-USR-05, ADM-USR-06, ADM-USR-09

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [ ] Table renders users, status, pending password indicator, and row actions.
- [ ] Create/edit modal validates editable fields.
- [ ] Delete modal is confirmation-only.
- [ ] No sort controls are rendered.
- [ ] Component tests cover rendering, modal submission, and delete confirmation.

**Tests**: component/unit
**Gate**: `pnpm --filter admin-ui test:unit -- --run`

---

### T11: Build `/users` view and route

**What**: Add the `/users` route and compose search, table, pagination, modals, empty states, and toast feedback.
**Where**: `apps/admin-ui/src/features/users/views/UsersView.vue`, `apps/admin-ui/src/router/index.ts`
**Depends on**: T10
**Reuses**: Existing Vue Router and PrimeVue setup
**Requirement**: ADM-USR-01, ADM-USR-02, ADM-USR-03, ADM-USR-04, ADM-USR-05, ADM-USR-06, ADM-USR-09

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [ ] `/users` loads the first page on entry.
- [ ] Search updates the list and clearing search restores unfiltered listing.
- [ ] Next page uses the received cursor.
- [ ] Empty states render for no users and no search matches.
- [ ] Success and error toasts render for all actions.
- [ ] View tests cover the main user flows.

**Tests**: component/unit
**Gate**: `pnpm --filter admin-ui test:unit -- --run`

---

### T12: Run Admin UI gates

**What**: Run UI unit tests, type-check, build, and fix issues in the implemented UI scope.
**Where**: `apps/admin-ui`
**Depends on**: T11
**Reuses**: Existing Vite/Vitest/Vue TS setup
**Requirement**: ADM-USR-08

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [ ] UI unit tests pass.
- [ ] UI type-check passes.
- [ ] UI build passes.
- [ ] Changed UI scope reaches at least 80% coverage where measurable.

**Tests**: unit/component/build
**Gate**: `pnpm --filter admin-ui test:unit -- --run && pnpm --filter admin-ui build`

---

### T13: Full feature verification

**What**: Run repository-level gates and manually verify the primary CRUD flows against the success criteria.
**Where**: Repository root, `apps/admin-api`, `apps/admin-ui`
**Depends on**: T7, T12
**Reuses**: `.specs/codebase/TESTING.md`
**Requirement**: ADM-USR-01, ADM-USR-02, ADM-USR-03, ADM-USR-04, ADM-USR-05, ADM-USR-06, ADM-USR-07, ADM-USR-08, ADM-USR-09

**Tools**:

- MCP: NONE
- Skill: `coding-guidelines`

**Done when**:

- [ ] Contracts build passes.
- [ ] API unit, e2e, coverage, and build gates pass.
- [ ] UI unit, type-check, and build gates pass.
- [ ] `pnpm lint` passes.
- [ ] Manual verification covers list, search, create, edit, block, unblock, delete, empty states, and error toasts.
- [ ] Requirement traceability is updated from Pending to implemented/verified statuses.

**Tests**: full
**Gate**: Full feature gate from `.specs/codebase/TESTING.md`

---

## Parallel Execution Map

The current dependency graph is intentionally mostly sequential because the shared contracts and schema changes affect both API and UI. After T3, backend T4-T7 and frontend T8-T12 can be assigned to separate workers if execution is delegated, but each lane should stay internally sequential.

```text
Foundation:
  T1 -> T2 -> T3

Backend lane:
  T3 -> T4 -> T5 -> T6 -> T7

Frontend lane:
  T3 -> T8 -> T9 -> T10 -> T11 -> T12

Final:
  T7 + T12 -> T13
```

---

## Pre-Approval Checks

### Task Granularity

| Task | Atomic Deliverable | Result |
| --- | --- | --- |
| T1 | One contracts package foundation | Pass |
| T2 | One database schema/migration change set | Pass |
| T3 | One API DTO contract adoption change set | Pass |
| T4 | One repository capability expansion | Pass |
| T5 | One service business-rule layer | Pass |
| T6 | One controller endpoint layer | Pass |
| T7 | One API gate alignment/verification task | Pass |
| T8 | One UI API service | Pass |
| T9 | One UI store | Pass |
| T10 | One UI component set for table/modals | Pass |
| T11 | One route/view composition | Pass |
| T12 | One UI gate verification task | Pass |
| T13 | One full feature verification task | Pass |

### Diagram-Definition Cross-Check

| Task | Diagram Dependency | `Depends on` Field | Result |
| --- | --- | --- | --- |
| T1 | Start | None | Pass |
| T2 | T1 | T1 | Pass |
| T3 | T1 + T2 | T1, T2 | Pass |
| T4 | T3 | T3 | Pass |
| T5 | T4 | T4 | Pass |
| T6 | T5 | T5 | Pass |
| T7 | T6 | T6 | Pass |
| T8 | T3 | T3 | Pass |
| T9 | T8 | T8 | Pass |
| T10 | T9 | T9 | Pass |
| T11 | T10 | T10 | Pass |
| T12 | T11 | T11 | Pass |
| T13 | T7 + T12 | T7, T12 | Pass |

### Test Co-Location Validation

| Task | Code Layer | Required Test Type | Task Tests | Result |
| --- | --- | --- | --- | --- |
| T1 | Shared contracts | Type/build | Type/build | Pass |
| T2 | API persistence schema | Integration | Integration | Pass |
| T3 | API DTO/contracts | Unit/type | Unit/type | Pass |
| T4 | API repository/persistence | Integration | Integration | Pass |
| T5 | API service/business rules | Unit | Unit | Pass |
| T6 | API HTTP controller | Integration | Integration | Pass |
| T7 | API gates | Unit/integration/coverage | Unit/integration/coverage | Pass |
| T8 | UI service/client | Unit | Unit | Pass |
| T9 | UI store | Unit | Unit | Pass |
| T10 | UI components | Component/unit | Component/unit | Pass |
| T11 | UI view/route | Component/unit | Component/unit | Pass |
| T12 | UI gates | Unit/component/build | Unit/component/build | Pass |
| T13 | Full feature | Full | Full | Pass |

---

## Tooling Question Before Execute

Before executing tasks, confirm whether to use only local tools or delegate backend/frontend lanes to sub-agents. Available skills relevant to execution: `codenavi`, `coding-guidelines`, `tlc-spec-driven`.

