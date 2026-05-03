# Frontend Architecture

**Application**: `apps/admin-ui`
**Analyzed**: 2026-05-03
**Status**: Draft

---

## Purpose and Scope

This document defines the baseline architecture for the admin frontend application. It is meant to keep the application simple, consistent, and easy to extend across the first two milestones:

1. Authentication
2. Administration application foundations and modules

This architecture applies to all future frontend feature work unless a feature design explicitly documents an approved exception.

---

## Product Context

- **Current milestone**: authentication
- **Next milestone**: start of the administration application itself
- **Primary users for now**: developers
- **Expected application patterns**:
  - dashboard pages with charts and summary cards
  - table-driven listing screens
  - create/edit/delete forms
- **Primary frontend goal**: stay simple and consistent
- **UI constraint**: prefer PrimeVue components whenever practical; build custom UI only when PrimeVue does not provide a suitable fit

---

## Technology Baseline

- **Framework**: Vue 3
- **Build tool**: Vite
- **Routing**: `vue-router`
- **State management**: Pinia
- **UI library**: PrimeVue
- **Styling support**: Tailwind CSS
- **HTTP client standard**: `ky`
- **Form validation direction**:
  - use PrimeVue form primitives for UI composition
  - use schema-driven validation through module-local schemas

---

## Architectural Principles

### 1. Feature-Based Modules First

The frontend is organized primarily by feature/module, not by technical layer at the application root.

Examples:

- `auth`
- `dashboard`
- `users`
- future administration domains

Each module owns its layouts, UI components, schemas, services, and stores.

### 2. Thin Pages, Orchestrated Stores

Vue pages and top-level route components should remain thin. They compose layouts and components, bind to stores, and delegate orchestration to Pinia stores and services.

### 3. Stores Coordinate, Services Execute HTTP

Pinia stores are responsible for state and application orchestration. They call service classes for HTTP operations and expose actions and derived state to the UI.

Services do not own UI state. They handle transport concerns only.

### 4. PrimeVue Before Custom UI

All modules should prefer PrimeVue components and patterns first. Custom components are allowed when:

- PrimeVue does not provide the needed behavior
- PrimeVue can provide the primitive but not the required composition
- domain-specific UI is needed and would otherwise be duplicated

### 5. Shared Code Must Be Intentionally Shared

Code should only move into `shared/` when at least two modules use it or when it is clearly application-wide infrastructure.

Avoid creating broad shared abstractions too early.

### 6. Consistency Over Cleverness

The architecture favors predictable structure and repeatable patterns over highly abstract solutions. New modules should look and behave like existing modules unless there is a strong reason not to.

---

## Application Shape

The admin UI is a Vue SPA with route-driven navigation.

### Milestone 1 Shape

- a login-focused authentication entry point
- redirect-based routing decisions
- no need for multiple complex shells yet

### Milestone 2 Shape

- an authenticated administration shell
- dashboard and CRUD-oriented modules
- feature routes mounted inside the authenticated shell

### Layout Model

The application has two layout families only:

- **Non-authenticated layout**: used by login and future forgot-password flows
- **Authenticated layout**: used by the administration area, with sidebar navigation on one side and the active page on the other

Feature modules may still define local layout wrappers for internal composition, but they must fit inside one of these two application-level layout families rather than inventing new top-level shells.

---

## Routing Model

Routing is application-level infrastructure and stays under `src/router`.

### Route Groups

- **Public routes**: authentication and any future unauthenticated pages
- **Protected routes**: dashboard and administration modules

### Rules

- Route definitions should reference module entry pages, not deeply nested components
- Authentication and redirect decisions should be centralized in router guards plus the auth store
- Protected modules should not each implement their own authentication checks
- The router owns navigation policy; modules own page content

---

## State Management Model

Pinia is the standard state layer.

### Store Responsibilities

- hold module state
- orchestrate async flows
- call services
- normalize request lifecycle state when needed
- expose actions and derived state to components

### Store Rules

- one module can have one or more stores
- stores should remain module-scoped unless they are truly cross-cutting
- stores should not contain raw HTTP implementation details
- stores may coordinate multiple service calls when required by a feature flow

### Cross-Cutting State

Only application-wide concerns should live outside feature modules, for example:

- authentication session state
- app bootstrap state
- global UI preferences if introduced later

Auth state is explicitly a global application concern and should remain in `src/shared/stores/`.

---

## Service Layer Model

Each feature module may define `services/` classes that encapsulate HTTP communication through `ky`.

### Service Responsibilities

- call backend endpoints
- map request parameters
- deserialize or shape responses if needed
- centralize endpoint paths for the module

### Service Rules

- services use `ky` as the default HTTP client
- services should not mutate Pinia state directly
- services should not import Vue components
- services should use shared contracts/types where available
- auth-sensitive requests should use the shared `ky` configuration established for the app

### Shared API Infrastructure

If multiple modules need common HTTP setup, create shared infrastructure under `src/shared/`, such as:

- a configured `ky` instance
- common request hooks
- error mapping helpers
- shared API types or transport utilities

Modules should consume that infrastructure instead of recreating it.

---

## UI Composition Model

Each module may define reusable module-scoped components under `components/`.

### Component Boundaries

- **Pages/views**: route entry points for a feature
- **Layouts**: reusable layout wrappers for pages within the same module
- **Components**: reusable module-scoped UI pieces
- **Shared UI**: only for cross-module reuse

### Layout Guidance

Each feature module may define a `layout/` folder for module-specific layout wrappers.

Examples:

- auth form shell
- dashboard content shell
- module page frame with header/actions

Do not place app-wide shell concerns inside module layouts. Those belong to shared application structure or the router-mounted shell.

---

## Form and Schema Model

Each module may define `schemas/` for form validation and related schema-driven behaviors.

### Schema Responsibilities

- validate user input
- define form constraints
- provide typed inputs for stores and services when useful

### Rules

- form schemas live with the module they belong to
- shared schemas only belong in `shared/` when they are used by multiple modules
- UI validation should follow schema definitions rather than duplicating ad hoc rules in components

---

## Shared Code Rules

`src/shared/` is reserved for cross-module code with clear application-wide value.

Expected shared categories:

- UI primitives used by multiple modules
- configured API client infrastructure
- generic composables
- shared types
- app-wide constants

Shared code is not a dumping ground for code that lacks a home.

Because authentication state affects routing, session bootstrap, and protected navigation across the entire application, the auth store is part of the approved shared application layer rather than a module-local store.

---

## Error and Loading Strategy

The app should follow predictable async states across modules.

### Expectations

- stores expose enough state for loading, success, and failure rendering
- service-level transport failures are translated into store-consumable outcomes
- modules handle expected user-facing errors locally
- global handling should be reserved for cross-cutting failures such as unauthorized session loss

Authentication failures are a special case and should integrate with the auth store and router behavior.

---

## Testing Direction

Frontend testing should follow the current repo testing baseline.

### Focus Areas

- store behavior
- router/auth coordination
- module component behavior where logic is meaningful
- schema validation behavior when non-trivial

### Non-Goals for Now

- no frontend e2e baseline is required yet
- avoid over-testing PrimeVue internals

---

## Recommended Module Contract

Each feature module should aim to provide:

- route entry pages
- optional module layouts
- module-scoped components
- schemas for forms and validation
- services for HTTP access through `ky`
- one or more Pinia stores for orchestration and state

This gives each module a predictable vertical slice.

---

## Non-Goals

- no micro-frontend architecture
- no SSR requirement
- no alternate UI component library strategy
- no heavy domain abstraction before the admin modules prove the need
- no global shared folder expansion without demonstrated reuse

---

## Open Questions

- `ky` is part of the intended architecture but is not yet present in `apps/admin-ui/package.json`
- charting strategy for dashboard pages has not yet been selected
