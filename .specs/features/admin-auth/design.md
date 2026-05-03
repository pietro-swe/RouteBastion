# Admin Authentication Design

**Spec**: `.specs/features/admin-auth/spec.md`
**Context**: `.specs/features/admin-auth/context.md`
**Status**: Draft

---

## Architecture Overview

Add a dedicated auth slice to `admin-api`, a shared `packages/admin-auth-contracts` package, and a small auth integration layer in `admin-ui`. Access authentication will be short-lived and stateless in signed access tokens, while refresh continuity will be stateful in Redis-backed refresh sessions transported with cookies and rotated on every refresh.

The API will issue and validate cookies, store refresh-session metadata in Redis, and expose guard classes that future admin endpoints can opt into. The UI will submit credentials with `credentials: "include"`, bootstrap session state on startup, and protect routes via the existing router/store structure.

```mermaid
graph TD
    A[Admin UI Login Form] --> B[Shared Auth Contracts Package]
    A --> C[Admin API POST /auth]
    C --> D[Auth Module]
    D --> E[Users Repository]
    D --> F[Password Hasher]
    D --> G[Access Token Signer]
    D --> H[Redis Refresh Session Store]
    C --> I[Set-Cookie Response]
    A --> J[Pinia Auth Store]
    J --> K[Router Guard]
    J --> L[/auth/refresh with credentials]
    L --> D
    J --> M[/auth/logout]
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| Module/service/repository pattern | `apps/admin-api/src/modules/users/*` | Mirror the existing Nest module structure for `auth` |
| Drizzle database service | `apps/admin-api/src/modules/infra/database/drizzle/drizzle.service.ts` | Reuse for user lookup and keep auth persistence in a dedicated adapter layer |
| Existing `UsersRepository` abstraction | `apps/admin-api/src/modules/users/users.repository.ts` | Extend or add auth-specific lookup methods rather than bypassing repository boundaries |
| Zod DTO pattern | `apps/admin-api/src/modules/users/inputs/create.ts` and `outputs/create.ts` | Keep request/response schemas aligned with current API style |
| Existing UI auth route/store placeholders | `apps/admin-ui/src/router/index.ts`, `src/shared/stores/auth.ts` | Fill in the current scaffolding instead of introducing a second state pattern |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| `users` table | Validate credentials against admin users and reject soft-deleted rows |
| Redis via Nest CacheModule | Persist refresh session records keyed by session ID or token family metadata |
| App env config | Add JWT secrets, TTLs, and cookie configuration to `apps/admin-api` env schema |
| Swagger docs | Expose auth endpoints and response schemas alongside existing Nest docs setup |

### Current Concerns the Design Must Address

| Concern | Source | Mitigation in This Design |
| ------- | ------ | ------------------------- |
| User creation currently stores plain password input in `passwordHash` | `apps/admin-api/src/modules/infra/database/drizzle/repositories/drizzle-users.repository.ts` | Auth rollout must introduce hashing and verification instead of trusting current stored values |
| User lookups do not filter `deletedAt` | same repository | Auth lookups must treat soft-deleted users as invalid identities |
| No shared package structure exists yet | repo layout | Create a focused auth contracts package rather than duplicating DTOs |

---

## Components

### Shared Auth Contracts Package

- **Purpose**: Provide the single source of truth for auth request/response/cookie-safe session payload schemas shared by API and UI.
- **Location**: `packages/admin-auth-contracts/`
- **Interfaces**:
  - `LoginInputSchema` / `LoginInput`
  - `LoginOutputSchema` / `LoginOutput`
  - `RefreshOutputSchema` / `RefreshOutput`
  - `LogoutOutputSchema` or empty-success response contract
  - `SessionUserSchema` / `SessionUser`
- **Dependencies**: `zod`
- **Reuses**: Existing Zod-first API DTO style

### Admin API Auth Module

- **Purpose**: Implement admin login, refresh, logout, token issuance, session rotation, and guard primitives.
- **Location**: `apps/admin-api/src/modules/auth/`
- **Interfaces**:
  - `POST /auth`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - Optional `GET /auth/me` for bootstrap-friendly current session retrieval
- **Dependencies**: `UsersRepository`, token service, cookie helper, refresh session store, password hasher
- **Reuses**: Existing Nest module/controller/service structure and Zod response patterns

### Password Hashing Adapter

- **Purpose**: Hash new/updated admin passwords and verify login credentials.
- **Location**: `apps/admin-api/src/modules/auth/` or a small shared security subfolder
- **Interfaces**:
  - `hash(password: string): Promise<string>`
  - `verify(password: string, hash: string): Promise<boolean>`
- **Dependencies**: `bcrypt`
- **Reuses**: None currently; this is a missing security capability

### Access Token Service

- **Purpose**: Sign and verify short-lived access tokens containing the minimal admin session claims.
- **Location**: `apps/admin-api/src/modules/auth/services/`
- **Interfaces**:
  - `issueAccessToken(user: SessionUser): Promise<string>`
  - `verifyAccessToken(token: string): Promise<AccessClaims>`
- **Dependencies**: JWT signing library, env config
- **Reuses**: Existing env/config module

### Refresh Session Store

- **Purpose**: Persist refresh-session state in Redis and enforce rotation/revocation.
- **Location**: `apps/admin-api/src/modules/auth/repositories/` plus infra Redis adapter
- **Interfaces**:
  - `create(session: RefreshSessionRecord): Promise<void>`
  - `consume(sessionId: string, presentedSecret: string): Promise<RefreshSessionRecord | null>`
  - `rotate(previousSessionId: string, nextSession: RefreshSessionRecord): Promise<void>`
  - `revoke(sessionId: string): Promise<void>`
- **Dependencies**: Nest `CacheModule`, `CACHE_MANAGER`, `@keyv/redis`, Redis env config
- **Reuses**: Existing Redis env vars and installed cache-related dependencies where practical

### Cookie Transport Helper

- **Purpose**: Centralize auth cookie names, attributes, serialization, clearing, and response writing.
- **Location**: `apps/admin-api/src/modules/auth/http/`
- **Interfaces**:
  - `setAuthCookies(reply, payload): void`
  - `clearAuthCookies(reply): void`
- **Dependencies**: `@fastify/cookie`, Fastify request/reply types, env-based cookie options
- **Reuses**: Fastify app bootstrap

### Redis Auth Cache Module

- **Purpose**: Configure Nest's cache integration to use Redis-backed storage for refresh-session persistence only.
- **Location**: `apps/admin-api/src/modules/infra/cache/` or `apps/admin-api/src/modules/auth/cache/`
- **Interfaces**:
  - `CacheModule.registerAsync(...)`
  - provider access via `@Inject(CACHE_MANAGER)`
- **Dependencies**: `@nestjs/cache-manager`, `cache-manager`, `@keyv/redis`, `ConfigService`
- **Reuses**: Existing config module and Redis env variables

### Auth Guards

- **Purpose**: Provide opt-in backend authorization primitives without yet applying them.
- **Location**: `apps/admin-api/src/modules/auth/guards/`
- **Interfaces**:
  - `AccessTokenGuard`
  - `OptionalSessionGuard` if needed for `/auth/me`
- **Dependencies**: Access token verification and request user context injection
- **Reuses**: Nest guard pattern

### Admin UI Auth Integration

- **Purpose**: Handle login form submission, startup bootstrap, refresh recovery, logout, and protected routing.
- **Location**: `apps/admin-ui/src/shared/stores/auth.ts`, `src/router/index.ts`, auth page/components
- **Interfaces**:
  - `login(credentials)`
  - `restoreSession()`
  - `logout()`
  - route meta / navigation guard contract
- **Dependencies**: shared auth contracts package, browser fetch client with `credentials: "include"`
- **Reuses**: existing Pinia store and router placeholders

---

## Data Models

### Session User

```ts
interface SessionUser {
	id: string;
	name: string;
	email: string;
}
```

**Relationships**: Derived from `users` rows and embedded in login/current-session responses.

### Access Claims

```ts
interface AccessClaims {
	sub: string;
	email: string;
	type: "access";
}
```

**Relationships**: Signed into short-lived access tokens and consumed by backend guards.

### Refresh Session Record

```ts
interface RefreshSessionRecord {
	sessionId: string;
	userId: string;
	tokenFamilyId: string;
	secretHash: string;
	issuedAt: string;
	expiresAt: string;
	replacedBySessionId: string | null;
	revokedAt: string | null;
}
```

**Relationships**: Stored in Redis, keyed for current-session lookup and refresh token rotation.

### Cookie Set

```ts
interface AuthCookies {
	accessToken: string;
	refreshToken: string;
}
```

**Relationships**: Written by login/refresh, cleared by logout and refresh failure handling.

---

## Endpoint and Flow Decisions

### Login

1. UI submits email/password with `credentials: "include"`.
2. API loads the admin user by email, rejects deleted users, verifies password hash.
3. API creates a Redis refresh session, signs a short-lived access token, sets auth cookies, and returns session user payload via shared contract.

### Refresh

1. UI calls `/auth/refresh` with cookies attached.
2. API validates the presented refresh token against Redis.
3. API rotates the refresh session, invalidates the previous session, issues fresh cookies, and returns updated session payload.

### Logout

1. UI calls `/auth/logout` with cookies attached.
2. API revokes the current refresh session in Redis if present.
3. API clears auth cookies and UI clears local auth state.

### Bootstrap

- Preferred approach: UI calls `/auth/me` on startup if it has reason to believe cookies exist; if unauthorized, it can fall back to `/auth/refresh` only if bootstrap semantics require silent recovery.
- If implementation simplicity is preferred, `/auth/refresh` can serve as the bootstrap entrypoint and return the same session payload as login.

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| Invalid email/password | `401 Unauthorized` auth error contract | Login page shows generic invalid-credentials message |
| Soft-deleted user | same as invalid credentials | No account-state leakage |
| Missing/expired access token | Guard rejects request | Protected API call fails cleanly; UI can attempt refresh or redirect |
| Invalid/replayed refresh token | `401 Unauthorized`, clear cookies | UI session is cleared and user returns to login |
| Redis unavailable during refresh/login | `503` or controlled server error response | User sees session-unavailable message and cannot continue silently |
| Cookie plugin misconfiguration | startup/config error | Fails fast instead of producing partial auth behavior |
| Corrupt client-side auth state | UI store reset | App returns to login without partial protected render |

---

## Tech Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Shared package scope | `packages/admin-auth-contracts` | Keeps the first contract package narrowly focused and easy to consume |
| Refresh persistence | Redis-backed session records | Required by user and supports rotation/revocation |
| Transport | Cookies for access and refresh tokens | Matches requested transport and simplifies browser request wiring |
| Login route | `POST /auth` | Locked by API requirement |
| Password hashing | `bcrypt` | Explicit security requirement |
| Nest cookie integration | `@fastify/cookie` | Official Fastify integration path from Nest docs |
| Redis integration path | Nest `CacheModule` backed by Redis only | Matches requested framework integration and avoids in-memory auth sessions |
| Guard rollout | Build guards now, do not attach yet | Prepares the API for protected endpoints without widening the first integration blast radius |
| User eligibility | Entire `users` table | Matches current admin-only identity table assumption |
| Soft-delete handling | Exclude `deletedAt != null` from auth | Avoids authenticating inactive admin users |

## Open Implementation Questions

- Whether to store both access and refresh tokens in cookies, or keep only refresh in an HTTP-only cookie and derive access state differently. The current user requirement only fixes cookie transport, not the split.
- JWT library choice and exact Redis key layout for refresh-token family/replay tracking.
