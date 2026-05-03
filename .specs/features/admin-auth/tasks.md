# Admin Authentication Tasks

**Design**: `.specs/features/admin-auth/design.md`
**Status**: Draft

---

## Execution Plan

### Phase 1: Foundation (Sequential)

`T1 → T2 → T3`

### Phase 2: Backend Core (Sequential, due to e2e/env/cookie coupling)

`T3 → T4 → T5 → T6`

### Phase 3: Frontend Integration (Sequential)

`T6 → T7 → T8`

### Phase 4: Final Verification (Sequential)

`T8 → T9`

## Task Breakdown

### T1: Create shared admin auth contracts package

**What**: Create `packages/admin-auth-contracts` with Zod schemas and exported types for login, refresh, logout, and session user payloads.
**Where**: `packages/admin-auth-contracts/*`
**Depends on**: None
**Reuses**: Zod contract style from `apps/admin-api/src/modules/users/inputs/create.ts`
**Requirement**: AUTH-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Package manifest, tsconfig, and entrypoint exist
- [ ] Auth schemas/types are exported from one package entrypoint
- [ ] `admin-api` and `admin-ui` can import from the package without duplicated local DTOs
- [ ] Gate check passes for package build/type-check

**Tests**: none
**Gate**: quick

---

### T2: Add backend auth foundations and security primitives

**What**: Add env schema entries, Nest Redis cache wiring, password hashing adapter, token service abstractions, and cookie helper scaffolding for auth.
**Where**: `apps/admin-api/src/modules/auth/**`, `apps/admin-api/src/modules/config/env/index.ts`, app bootstrap wiring
**Depends on**: T1
**Reuses**: Existing env module and module/provider organization
**Requirement**: AUTH-01, AUTH-03, AUTH-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Env schema includes auth secrets, TTLs, and cookie settings
- [ ] `@fastify/cookie` registration is wired into Fastify bootstrap
- [ ] Nest `CacheModule` is configured asynchronously for Redis-backed usage only
- [ ] Redis-backed refresh session interface and adapter exist
- [ ] Password hashing and token service abstractions exist using `bcrypt`
- [ ] Cookie helper is ready to read/set/clear auth cookies with Fastify
- [ ] Unit tests cover core helpers/services
- [ ] Gate check passes: `pnpm --filter admin-api test`

**Install commands**:

- `pnpm install @fastify/cookie bcrypt jsonwebtoken --filter admin-api`
- `pnpm install @types/bcrypt @types/jsonwebtoken --filter admin-api --save-dev`

**Tests**: unit
**Gate**: quick

---

### T3: Fix admin user credential persistence and lookup safety

**What**: Update admin user persistence and lookup behavior so passwords are hashed with `bcrypt` and soft-deleted users are excluded from auth-relevant reads.
**Where**: `apps/admin-api/src/modules/users/**`, `apps/admin-api/src/modules/infra/database/drizzle/repositories/drizzle-users.repository.ts`
**Depends on**: T2
**Reuses**: Existing `UsersRepository` abstraction
**Requirement**: AUTH-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] New user passwords are no longer stored as plain text
- [ ] Auth/user lookup path excludes soft-deleted rows
- [ ] Unit tests cover hashing integration and deleted-user behavior
- [ ] Gate check passes: `pnpm --filter admin-api test`

**Tests**: unit
**Gate**: quick

---

### T4: Implement auth API endpoints and Redis-backed refresh rotation

**What**: Implement `POST /auth`, refresh, logout, and optional current-session endpoint behavior using shared contracts, cookie transport, and Redis refresh rotation.
**Where**: `apps/admin-api/src/modules/auth/**`, `apps/admin-api/src/app.module.ts`, Swagger setup if needed
**Depends on**: T3
**Reuses**: Nest controller/service patterns and shared contracts package
**Requirement**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `POST /auth` verifies credentials and returns the documented session payload
- [ ] Refresh rotates refresh sessions in Redis and rejects replay/revoked sessions
- [ ] Logout revokes refresh state and clears cookies
- [ ] Optional session bootstrap endpoint is implemented if chosen
- [ ] E2E tests cover login, refresh, replay rejection, and logout
- [ ] Gate check passes: `pnpm --filter admin-api build && pnpm --filter admin-api test && pnpm --filter admin-api test:e2e`

**Tests**: e2e
**Gate**: full

---

### T5: Add backend auth guards without applying them

**What**: Create access-token guard primitives and request user context support for future protected admin endpoints, but do not attach them to existing routes.
**Where**: `apps/admin-api/src/modules/auth/guards/**`
**Depends on**: T4
**Reuses**: Access token verification from auth services
**Requirement**: AUTH-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Guard classes exist and can validate access tokens
- [ ] Request user context extraction is defined
- [ ] No existing route is modified to require auth yet
- [ ] Unit tests cover guard behavior or token-verification helper behavior
- [ ] Gate check passes: `pnpm --filter admin-api test`

**Tests**: unit
**Gate**: quick

---

### T6: Build Admin UI auth API integration and store

**What**: Implement the UI auth client/store flow for login, bootstrap, refresh recovery, and logout using cookie-backed requests and the shared contract package.
**Where**: `apps/admin-ui/src/shared/stores/auth.ts`, supporting API utilities under `apps/admin-ui/src/shared/**`
**Depends on**: T4
**Reuses**: Existing Pinia auth store placeholder
**Requirement**: AUTH-01, AUTH-03, AUTH-05, AUTH-06, AUTH-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Store tracks authenticated user, loading state, and session restoration state
- [ ] Requests send `credentials: "include"`
- [ ] Login, refresh recovery, and logout flows call the API correctly
- [ ] Unit tests cover success/failure session transitions
- [ ] Gate check passes: `pnpm --filter admin-ui test:unit`

**Tests**: unit
**Gate**: quick

---

### T7: Add login route, page, and protected navigation flow

**What**: Implement the login UI and router protection so unauthenticated users are redirected away from protected routes.
**Where**: `apps/admin-ui/src/router/index.ts`, auth page/components, related route files
**Depends on**: T6
**Reuses**: Existing `routes.Login` and router scaffold
**Requirement**: AUTH-01, AUTH-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Login page submits credentials through the auth store
- [ ] Protected routes declare auth requirements
- [ ] Router redirects unauthenticated access to login
- [ ] Unit/component tests cover redirect behavior and login submission states
- [ ] Gate check passes: `pnpm --filter admin-ui test:unit`

**Tests**: unit
**Gate**: quick

---

### T8: Wire end-to-end UI bootstrap behavior

**What**: Integrate app startup with auth restoration so reloads on protected routes behave correctly with cookie-backed sessions.
**Where**: `apps/admin-ui/src/main.ts`, `apps/admin-ui/src/App.vue`, auth store/router integration points
**Depends on**: T7
**Reuses**: Auth store from T6 and route rules from T7
**Requirement**: AUTH-03, AUTH-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] App startup waits for or safely handles initial auth restoration
- [ ] Expired sessions fall back to login without partial protected render
- [ ] Unit tests cover bootstrap success and bootstrap failure paths
- [ ] Gate check passes: `pnpm --filter admin-ui build && pnpm --filter admin-ui test:unit`

**Tests**: unit
**Gate**: full

---

### T9: Run workspace verification and align docs/config

**What**: Run the full verification pass for the affected apps and finalize any README/env example/package wiring needed for the auth slice.
**Where**: workspace manifests, env examples, auth-related docs if needed
**Depends on**: T8
**Reuses**: prior tasks' implementation
**Requirement**: AUTH-01, AUTH-03, AUTH-05, AUTH-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Workspace package wiring is stable
- [ ] Required env examples/documentation for auth are present
- [ ] Any Admin API dependency installation uses `pnpm install ... --filter admin-api`
- [ ] Full verification passes across affected apps
- [ ] No auth contract duplication remains

**Tests**: none
**Gate**: full

---

## Parallel Execution Map

No tasks are marked `[P]` in this draft. The current auth scope touches shared contracts, env/config, cookie transport, and request/session behavior in ways that make sequential integration lower-risk than parallel changes.

## Diagram-Definition Cross-Check

| Task | Depends on in task | Matches execution plan |
| ---- | ------------------ | ---------------------- |
| T1 | None | Yes |
| T2 | T1 | Yes |
| T3 | T2 | Yes |
| T4 | T3 | Yes |
| T5 | T4 | Yes |
| T6 | T4 | Yes |
| T7 | T6 | Yes |
| T8 | T7 | Yes |
| T9 | T8 | Yes |

## Test Co-location Validation

| Task | Primary layer touched | Tests field | Gate | Validation |
| ---- | --------------------- | ----------- | ---- | ---------- |
| T1 | Shared contracts package | none | quick | Pass |
| T2 | API services/helpers | unit | quick | Pass |
| T3 | API repository/service | unit | quick | Pass |
| T4 | API endpoint/cookie/session flow | e2e | full | Pass |
| T5 | API guard primitives | unit | quick | Pass |
| T6 | UI store/session flow | unit | quick | Pass |
| T7 | UI router/page flow | unit | quick | Pass |
| T8 | UI bootstrap integration | unit | full | Pass |
| T9 | Workspace/docs/config | none | full | Pass |
