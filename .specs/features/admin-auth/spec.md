# Admin Authentication Specification

## Problem Statement

The admin surface currently has user management data structures but no authentication flow connecting the Admin API and Admin UI. We need a shared, type-safe authentication contract inside the monolith so both applications implement the same login, refresh, logout, and current-session behavior without drift.

This feature must establish a secure admin session model with refresh token support, a minimal login-only Admin UI, and backend authorization boundaries that future admin-only endpoints can reuse.

## Goals

- [ ] Admin users can authenticate from the Admin UI against the Admin API.
- [ ] Access and refresh flows use shared contracts consumed by both applications.
- [ ] The Admin UI exposes a single login page with validated form submission and redirect behavior.
- [ ] Session renewal works without forcing frequent re-login while preserving revocation control.

## Out of Scope

Explicitly excluded for the first slice to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Forgot-password and password-reset flows | Separate user recovery feature with different UX and security requirements |
| Role/permission matrix beyond authenticated admin access | Authorization model can be added after baseline authentication exists |
| Multi-factor authentication | Valuable, but not required to establish the base auth/session architecture |
| Social login / SSO | Different identity integration problem |

---

## User Stories

### P1: Admin Sign-In and Protected Session ⭐ MVP

**User Story**: As an admin user, I want to sign in to the Admin UI so that I can access protected administration features.

**Why P1**: Without this, the admin product cannot be safely exposed.

**Acceptance Criteria**:

1. WHEN a valid admin email and password are submitted to `POST /auth` THEN the Admin API SHALL authenticate the user and return the shared login response contract.
2. WHEN authentication succeeds THEN the Admin UI SHALL persist the session according to the chosen cookie-based strategy and redirect away from the login page.
3. WHEN invalid credentials are submitted THEN the Admin API SHALL reject the request with a documented auth error contract and the Admin UI SHALL present a non-destructive error state.
4. WHEN the Admin UI is loaded without an authenticated session THEN it SHALL redirect to the login route rather than rendering a second application page.

**Independent Test**: Submit valid credentials, observe successful redirect behavior, reload the app, and confirm the login flow restores or clears the session correctly.

---

### P1: Refresh Token Session Renewal ⭐ MVP

**User Story**: As an authenticated admin user, I want my session to refresh safely so that I do not need to log in repeatedly during normal usage.

**Why P1**: Refresh support is an explicit requirement and affects both contract design and backend persistence.

**Acceptance Criteria**:

1. WHEN the access token is expired or near expiry THEN the Admin UI SHALL call the refresh endpoint using the shared refresh request contract.
2. WHEN the refresh token is valid THEN the Admin API SHALL issue a new access token and rotate or reuse the refresh token according to the chosen policy.
3. WHEN the refresh token is invalid, expired, or revoked THEN the Admin API SHALL deny refresh and the Admin UI SHALL clear the session and return the user to login.
4. WHEN refresh succeeds THEN the Admin UI SHALL continue the in-progress authenticated experience without requiring a manual reload.

**Independent Test**: Authenticate, expire or simulate expiry of the access token, trigger refresh, and confirm protected API calls continue succeeding.

---

### P1: Logout and Session Termination ⭐ MVP

**User Story**: As an authenticated admin user, I want to log out so that my current session can no longer be used from this client.

**Why P1**: Baseline session lifecycle is incomplete without revocation/termination behavior.

**Acceptance Criteria**:

1. WHEN the admin logs out THEN the Admin UI SHALL clear client-side auth state.
2. WHEN the admin logs out THEN the Admin API SHALL invalidate the current refresh token or refresh session according to the chosen persistence model.
3. WHEN a logged-out client attempts refresh using the previous session THEN the Admin API SHALL reject it.

**Independent Test**: Log in, log out, then attempt refresh or a protected request and confirm re-authentication is required.

---

### P2: Current Session Bootstrap

**User Story**: As an admin user, I want the UI to restore my current authenticated session on app load so that refreshes and page reloads do not force navigation glitches.

**Why P2**: Strongly improves UX, but depends on the agreed session strategy and can ship just after the core auth slice.

**Acceptance Criteria**:

1. WHEN the Admin UI starts with a still-valid session THEN it SHALL resolve the current user/session state before deciding whether to keep or leave the login route.
2. WHEN the Admin UI starts with an invalid or expired session that cannot be refreshed THEN it SHALL present the unauthenticated flow.

**Independent Test**: Refresh the browser while authenticated and verify the app restores or rejects the session correctly before redirecting.

---

### P2: Shared Auth Contract Package

**User Story**: As a developer, I want authentication request/response schemas in a shared monolith package so that Admin API and Admin UI consume one source of truth.

**Why P2**: Prevents contract drift and supports future admin auth endpoints.

**Acceptance Criteria**:

1. WHEN auth contracts are defined THEN they SHALL live in a shared package consumed by both applications.
2. WHEN either application imports auth DTO/schema types THEN those imports SHALL resolve from the shared package rather than duplicate local definitions.
3. WHEN a contract changes THEN both applications SHALL fail type checks or tests until aligned.

**Independent Test**: Use one shared contract in the API and the UI and verify both projects type-check.

---

## Edge Cases

- WHEN a user record exists but is soft-deleted THEN system SHALL deny authentication.
- WHEN the same refresh token is replayed after logout or rotation THEN system SHALL reject the request.
- WHEN a future protected API endpoint receives no access token THEN system SHALL reject it with the documented unauthorized contract.
- WHEN a future protected API endpoint receives a malformed or expired access token THEN system SHALL reject it without leaking sensitive detail.
- WHEN the UI boots with partial or corrupted local auth state THEN system SHALL clear that state and fall back to login.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| AUTH-01 | P1: Admin Sign-In and Protected Session | Design | Pending |
| AUTH-02 | P1: Admin Sign-In and Protected Session | Design | Pending |
| AUTH-03 | P1: Refresh Token Session Renewal | Design | Pending |
| AUTH-04 | P1: Refresh Token Session Renewal | Design | Pending |
| AUTH-05 | P1: Logout and Session Termination | Design | Pending |
| AUTH-06 | P2: Current Session Bootstrap | Design | Pending |
| AUTH-07 | P2: Shared Auth Contract Package | Design | Pending |

**Coverage:** 7 total, 0 mapped to tasks, 7 unmapped

## Success Criteria

- [ ] An admin can log in from the Admin UI and complete the expected redirect flow end-to-end.
- [ ] The Admin API exposes documented `POST /auth`, refresh, and logout contracts shared through one monorepo package.
- [ ] A refresh attempt can renew an expired access token during an active session.
- [ ] Invalid, expired, revoked, or replayed refresh sessions are rejected safely.

## Locked Implementation Constraints

1. Login credentials are submitted to `POST /auth`.
2. JWT generation and verification use `@nestjs/jwt`.
3. Refresh sessions are Redis-backed and rotate on every successful refresh.
4. Authentication transport is cookie-based.
5. Password hashing uses `bcrypt`.
6. The frontend ships only a login page with redirects, built with `@primevue/forms` and `zod` validation.
7. Backend guards are implemented now but not yet applied to existing routes.
