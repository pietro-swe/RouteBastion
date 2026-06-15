# admin-ui Skeleton
> Vue 3 admin panel — scaffolded, mostly unwired

Stack: Vue 3 + Vite + PrimeVue (Aura theme, `inputVariant: filled`, ripple) + Pinia + Vue Router + Tailwind v4 + ky (HTTP) + Zod.
Entry: `src/main.ts` — registers Pinia, router, PrimeVue. Mounts `#app`.

State (what's actually wired vs not):
- Router `src/router/index.ts`: `routes: []` is **empty** — no routes registered yet. A `routes` const map (Login=`/auth`, ForgotPassword, Dashboard) is exported but unused.
- Auth store `src/shared/stores/auth.ts`: `defineStore("Auth", () => {})` — empty body.
- `src/@types/user.ts`: `User = { id, name, email, birthDate }` (no password/status/flags).
- Scaffolded but EMPTY dirs: `src/modules/auth/{pages,layout}` (no files).

Tests: Vitest + @vue/test-utils + jsdom. Currently only `src/__tests__/App.spec.ts`.

Planned: `/users` admin screen with cursor pagination, name search, create/edit/block/delete via modals — see `.specs/features/admin-users-crud/`. Will consume shared contracts from `apps/packages/contracts` (not yet created).

Updated: 2026-06-15
