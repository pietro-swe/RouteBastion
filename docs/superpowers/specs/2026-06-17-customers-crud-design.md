# Customers CRUD — Admin API + Admin UI

Status: approved (2026-06-17)

## Context

RouteBastion already has a complete **Admins** CRUD (NestJS API + Vue UI) that established the
monorepo's conventions. The `customers` table already exists in the Drizzle schema and in migration
`0000_init.sql`, but no application layer exists for it on either side.

Goal: ship a **Customers** CRUD (tenant entity: `name` + `businessIdentifier`/CNPJ) mirroring the
Admins module, so an admin can list, create, edit and remove customers.

### Decisions

- **Soft-delete** — the table already has `deletedAt`, and customers own children
  (`api_keys`/`vehicles`/`constraints`). `DELETE` sets `deletedAt`; all lookups and listing filter
  `deletedAt IS NULL`.
- **Scope: the Customer entity only** — `name` + `businessIdentifier`. Child resources are out of scope.
- **CNPJ validation** — validate the Brazilian CNPJ check digits in a shared Zod schema. Stored/returned
  value is the 14-digit normalized string; the UI applies the mask for display. Alphanumeric CNPJ
  (effective Jul/2026) is out of scope; the classic numeric format is validated.

### Differences vs Admins (and why)

- No `status` column → **no** block/unblock endpoints or actions.
- **Soft-delete** instead of physical delete.
- `businessIdentifier` (CNPJ) instead of `email`/`birthDate`.

## Conventions reused (do not reinvent)

- API: `Controller → Service (returns `Result<Err, T>`, no throw) → abstract Repository + Drizzle impl`.
- Cursor keyset pagination (10/page, `createdAt DESC, id DESC`), as in `admins/cursor.ts` and the repo `list()`.
- DTOs via `createZodDto(<schema from @route-bastion/contracts>)`; global Zod pipe/interceptor/filter.
- Exceptions `AlreadyExistsException` → 409, `NotFoundException` → 404, Zod → 422.
- UI: per-feature module (`views/`, `components/`, `services/`, `stores/`, `form.ts`), `ky` client,
  PrimeVue + Zod, hardcoded PT-BR strings, Pinia store with `cursorStack` + `refetch()` after mutations.

## Part 0 — Shared contracts (`apps/packages/contracts`)

New `src/customers.ts` (mirrors `src/admins.ts`) + `export * from "./customers.js"` in `src/index.ts`.

```ts
export const cnpjSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine(isValidCnpj, { message: "CNPJ inválido" });
```

- `isValidCnpj`: 14 digits, rejects repetition (`00000000000000`…), validates both check digits (mod 11).
- Schemas: `createCustomerInputSchema` `{ name: string.min(1), businessIdentifier: cnpjSchema }`,
  `updateCustomerInputSchema` (same), `customerOutputSchema` `{ id, name, businessIdentifier, createdAt, modifiedAt }`,
  `listCustomersQuerySchema` `{ cursor?, search? }`, `listCustomersOutputSchema` `{ items, nextCursor }`.
- Test `customers.spec.ts`: valid CNPJ, masked input normalization, wrong check digit, repetition, length.

## Part 1 — Migration: partial unique index

Because deletes are soft, a global `UNIQUE` on `business_identifier` would block re-creating a customer
with the CNPJ of a soft-deleted one. Replace it with a **partial unique index** `WHERE deleted_at IS NULL`.

In `…/drizzle/tables/customers.ts`: drop `.unique()` from `businessIdentifier` and add a table-level
`uniqueIndex("customers_business_identifier_unique").on(t.businessIdentifier).where(sql\`deleted_at IS NULL\`)`.
Generate the migration with `pnpm drizzle-kit generate`.

## Part 2 — Customers module (Admin API)

New `apps/admin-api/src/modules/customers/` mirroring `modules/admins/`:

- `@types/index.ts` — `Customer`, `CreateCustomerData`, `UpdateCustomerData`, `CustomersCursor`, `ListCustomersParams/Result`.
- `cursor.ts` + `cursor.spec.ts` — base64url codec for `{ createdAt, id }` (direct copy).
- `inputs/{create,update,list-query}.ts`, `outputs/{customer,list}.ts` — `class … extends createZodDto(<schema>)`.
- `customers.repository.ts` (abstract) — `getByID`, `getByBusinessIdentifier`, `list`, `create`, `update`, `softDelete`.
- `customers.service.ts` — `create` (409 on duplicate), `update` (404/409, `modifiedAt = now()`),
  `delete` (soft-delete, 404 if missing/already deleted), `list` (cursor + `toOutput`).
- `customers.controller.ts` (`@Controller("customers")`, `@ApiTags("customers")`): `POST` 201/409,
  `GET` 200, `PUT :id` 200/404/409, `DELETE :id` 204/404. No block/unblock.
- `customers.module.ts` — imports `DatabaseModule`, provides `CustomersService`, controller `CustomersController`.
- `customers.service.spec.ts` — unit with mocked repo.

Infra:
- `…/drizzle/repositories/drizzle-customers.repository.ts` — all lookups + `list` filter `isNull(deletedAt)`;
  keyset `(desc createdAt, desc id)` + `limit+1`; `search` does `ILIKE` on `name` and `business_identifier`;
  `softDelete` sets `deletedAt = now()`.
- Register `{ provide: CustomersRepository, useClass: DrizzleCustomersRepository }` in `DatabaseModule`
  (and export it).
- `app.module.ts` — add `CustomersModule`.
- `test/customers.e2e-spec.ts` — create 201, invalid CNPJ 422, duplicate 409, list+cursor (10),
  search by name/CNPJ, update 200/404/409, soft-delete 204 + excluded from list, re-create after delete 201.

## Part 3 — Customers module (Admin UI)

New `apps/admin-ui/src/modules/customers/` mirroring `modules/admins/`:

- `services/customers.service.ts` — `list/create/update/remove` (no block/unblock).
- `stores/customers.store.ts` — copy of admins store minus block/unblock.
- `form.ts` — `customerFormSchema` from `createCustomerInputSchema`; `toCustomerInput` normalizes CNPJ digits.
- `views/CustomersView.vue` — DataTable: Customer (name + initials), CNPJ (formatted), Created at, Actions
  (Edit, Delete); debounced search; prev/next pagination; empty state.
- `components/CustomerFormDialog.vue` — Name (`InputText`) + CNPJ (`InputMask` `99.999.999/9999-99`).
- `components/DeleteCustomerDialog.vue` — confirmation with the customer name.
- `shared/format/cnpj.ts` — `formatCnpj(digits)`.
- Router entry `Customers: "/dashboard/customers"` + lazy route; sidebar item in `DashboardLayout.vue`.
- Specs mirroring admins (form, service, store, view, components).

## Verification

- `pnpm install`; build contracts before API/UI.
- API: `pnpm --filter admin-api test` (unit) and `pnpm --filter admin-api test:e2e` (Docker + `DATABASE_URL`);
  apply migration.
- UI: `pnpm --filter admin-ui test`; run API + UI and exercise create/list/search/edit/delete; confirm invalid
  CNPJ is blocked in the form and a deleted customer disappears from the list.
- Biome lint/format in both apps.
