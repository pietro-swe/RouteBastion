# Frontend Structure

**Application**: `apps/admin-ui`
**Analyzed**: 2026-05-03
**Status**: Draft

---

## Goal

Define the target folder structure for the admin frontend so new modules are added consistently and remain easy to navigate.

This structure is feature-based and aligned with the current frontend architecture baseline.

---

## Root `src/` Structure

```text
src/
  main.ts
  App.vue
  router/
  shared/
  modules/
```

### Root Responsibilities

- `main.ts`: app bootstrap and plugin registration
- `App.vue`: top-level app composition
- `router/`: route definitions and route guards
- `shared/`: intentionally shared cross-module code
- `modules/`: feature-based application modules

---

## Module Structure Standard

Each feature module should follow this structure when applicable:

```text
src/modules/<module-name>/
  layout/
  components/
  schemas/
  services/
  stores/
  pages/
```

### Folder Responsibilities

#### `layout/`

Vue files with reusable layouts that are common inside the module.

Examples:

- `AuthLayout.vue`
- `DashboardLayout.vue`
- `UsersLayout.vue`

#### `components/`

Reusable module-scoped components.

Examples:

- filter bars
- table wrappers specific to the module
- form sections
- cards and summaries tied to the feature domain

#### `schemas/`

Validation and form schemas for module flows.

Examples:

- login form schema
- create user schema
- edit user schema

#### `services/`

Classes responsible for HTTP communication through `ky`.

Examples:

- `AuthService.ts`
- `UsersService.ts`
- `DashboardService.ts`

Rules:

- keep endpoint interaction here
- do not manage Pinia state here
- prefer one primary service class per domain area unless the module clearly needs more separation

#### `stores/`

Pinia stores that orchestrate requests and manage module state.

Examples:

- `useAuthStore.ts`
- `useUsersStore.ts`

Rules:

- stores call services
- stores expose actions and state to pages/components
- stores coordinate loading and error handling for the module

#### `pages/`

Route-level Vue components for the module.

Examples:

- `LoginPage.vue`
- `DashboardPage.vue`
- `UsersListPage.vue`
- `UserEditPage.vue`

Pages should remain thin and compose layouts, stores, and components.

---

## Example Module Layouts

### Authentication Module

```text
src/modules/auth/
  layout/
    AuthLayout.vue
  components/
    LoginForm.vue
  schemas/
    login.schema.ts
  services/
    AuthService.ts
  stores/
    useAuthStore.ts
  pages/
    LoginPage.vue
```

### Users Administration Module

```text
src/modules/users/
  layout/
    UsersLayout.vue
  components/
    UsersTable.vue
    UserForm.vue
  schemas/
    user-form.schema.ts
  services/
    UsersService.ts
  stores/
    useUsersStore.ts
  pages/
    UsersListPage.vue
    UserCreatePage.vue
    UserEditPage.vue
```

---

## Shared Structure

Use `src/shared/` only for code with confirmed cross-module value.

Suggested shape:

```text
src/shared/
  api/
  components/
  composables/
  stores/
  types/
  utils/
```

### Shared Folder Guidance

#### `api/`

Shared API infrastructure, such as:

- configured `ky` client
- auth-aware request configuration
- transport helpers
- shared error mapping utilities

#### `components/`

UI building blocks used by multiple modules.

Do not move module-specific UI here too early.

#### `composables/`

Reusable Vue composables with cross-module value.

#### `stores/`

Only application-wide stores belong here.

Approved candidate:

- auth session state, because it drives routing, bootstrap, and protected app behavior globally

#### `types/`

Shared types used across multiple modules.

#### `utils/`

Framework-agnostic helpers with broad reuse.

---

## Routing Structure

Suggested routing layout:

```text
src/router/
  index.ts
  guards/
  routes/
```

### Responsibilities

- `index.ts`: router creation
- `guards/`: auth and navigation guards
- `routes/`: route records grouped by area or module if routing grows

For the current application size, a single `index.ts` is acceptable. Split only when routing becomes meaningfully larger.

---

## Application Layout Structure

The application should expose only two top-level layout families:

```text
src/shared/components/layouts/
  AuthenticatedLayout.vue
  NonAuthenticatedLayout.vue
```

### Responsibilities

- `AuthenticatedLayout.vue`: sidebar navigation plus active page content area
- `NonAuthenticatedLayout.vue`: screens such as login and forgot password

These are application-level layouts, not feature-local layouts.

Feature modules may still keep `layout/` folders for module-specific inner composition, but they should not create additional top-level shells.

---

## Naming Conventions

- Vue SFCs: `PascalCase.vue`
- stores: `useXStore.ts`
- services: `XService.ts`
- schemas: `x.schema.ts` or `<feature>.schema.ts`
- route pages: `XPage.vue`
- module folders: `kebab-case`

---

## Growth Rules

### Add a New Module When

- a feature has its own routes, state, and HTTP interactions
- the feature represents a distinct administration domain

### Keep Code Inside a Module When

- the code serves only that feature
- reuse is speculative rather than real

### Promote Code to `shared/` When

- at least two modules use it
- it represents application infrastructure rather than feature behavior

---

## Migration Direction from Current Structure

Current code is still minimal and can move into the target structure incrementally.

Recommended first moves:

1. introduce `src/modules/auth/`
2. keep the auth store in `src/shared/stores/` as the global session authority
3. create shared API infrastructure once `ky` is introduced
4. add `AuthenticatedLayout.vue` and `NonAuthenticatedLayout.vue` under shared layout components
5. route login through module pages instead of keeping auth concerns spread across `router/` and `shared/`

---

## Open Questions

- whether module-local `layout/` folders will be used immediately or only once modules need inner reusable composition beyond the two top-level application layouts
