# Admin Authentication Context

**Gathered:** 2026-05-03
**Spec:** `.specs/features/admin-auth/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Deliver admin login, refresh, logout, shared auth contracts, a single Admin UI login page, redirect behavior, and backend guard primitives for the admin surface. The feature does not include password recovery, MFA, role/permission modeling beyond authenticated admin access, or additional authenticated UI pages.

---

## Implementation Decisions

### Refresh Session Storage

- Refresh sessions will be persisted in Redis.
- Redis is the source of truth for refresh session validity, rotation, and revocation.
- Nest cache integration should use Redis-backed `CacheModule` configuration only for auth session storage.

### Token Transport

- Authentication will use cookies rather than browser storage-managed bearer tokens.
- Cookie-based transport should support a secure Admin UI session flow with server-managed refresh handling.
- Fastify cookie support should be implemented with `@fastify/cookie`.

### JWT Library

- JWT generation and verification should use `@nestjs/jwt`.
- Nest's `JwtModule` and `JwtService` are the expected integration path for token issuance and validation.

### Refresh Rotation

- Refresh tokens rotate on every successful refresh.
- Reuse of a previously rotated refresh token must be treated as invalid.

### Admin Identity Scope

- Every record in the existing `users` table is an admin identity.
- Customer authentication is explicitly out of scope and will use a different table later.

### Guard Delivery

- Backend auth guards should be created as part of this feature.
- Those guards should not yet be applied to existing endpoints.

### Frontend Scope

- The Admin UI should expose only a login page in this slice.
- After successful login or during unauthenticated startup, routing behavior should use redirects rather than rendering additional pages.
- The login form should be built with `@primevue/forms`.
- Form validation should use `zod` through the PrimeVue Forms resolver path.

### Agent's Discretion

- Cookie naming conventions.
- Exact split between `packages/admin-auth-contracts` exports and internal API-only types.
- Whether the UI bootstraps current session via `/auth/me` or by relying only on refresh plus cached user payload.
- Whether both access and refresh tokens live in cookies, or only refresh is HTTP-only and access state is derived differently.

---

## Specific References

- No external product references were provided.
- The monolith should keep contracts in a shared internal package consumed by `apps/admin-api` and `apps/admin-ui`.
- Use `bcrypt` for secure password hashing.
- Use `@nestjs/jwt` for JWT token work.
- Use `@primevue/forms` plus Zod resolver-based validation for the login form.
- If dependencies are needed in the Admin API, install them with `pnpm install ... --filter admin-api`.

## Deferred Ideas

- Customer-facing authentication using a different identity table.
- Authorization roles/permissions on top of authenticated admin access.
- Password reset/recovery.
- Multi-factor authentication.
