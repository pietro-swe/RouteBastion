# Domain Model
> VRP (Vehicle Routing Problem) brokering — multi-tenant

Source of truth (broker): `apps/broker/sql/schema.sql`.
Source of truth (admin-api): a DBDiagram.io ERD (authoritative), realized in Drizzle at `apps/admin-api/src/modules/infra/database/drizzle/tables/*` + `schema.ts`. admin-api mirrors only the CONFIG entities below (customers, api_keys, providers + children, constraints, vehicles) plus its own `admins` table — it does **NOT** include the optimization tables. It also diverges from broker: `uuidv7()` PKs (not `uuid_generate_v4()`), no `customers.contact_email`, no `modified_at` on `provider_constraints`/`provider_features`, and singular `provider_*` child table names.

Core entities:
- **customers** — tenants. `business_identifier` unique. Soft-delete.
- **api_keys** — per-customer. `key_hash` unique, `revoked_at`/`last_used_at`. Auth credential for broker API.
- **providers** — external VRP solution providers. Related:
  - provider_access_methods — `communication_method` (http|protocol_buffers) + url
  - provider_constraints — `max_waypoints_per_request`
  - provider_features — `supports_async_operations`
- **constraints** — per-customer rules. `kind` (budget|availability|performance|security|feature), `value` jsonb. Unique (customer_id, kind).
- **vehicles** — per-customer. `plate`, `capacity`, `cargo_kind` (bulk|containerized|refrigerated|dry|alive|dangerous|fragile|indivisible_and_exceptional|vehicle). Unique (customer_id, plate).
- **optimizations** — a routing request. `kind` (sync|batch). **Broker-only — not mirrored in admin-api.** Children:
  - optimization_runs — one per provider attempt. `status` (enqueued|running|executed|failed|canceled), `cost`
  - optimization_waypoints — `sequence` + lat/lng. Unique (optimization_id, sequence)
  - optimization_vehicles — M:N optimization ↔ vehicle

Enums (broker): constraint_kind, optimization_status, communication_method, request_kind, cargo_kind.

Conventions:
- Soft-delete: `created_at`/`modified_at`/`deleted_at` on most tables; partial indexes `... WHERE deleted_at IS NULL`.
- PKs: `uuid_generate_v4()` in broker; `uuidv7()` in admin-api.

admin-api **admins** table (renamed from `users` on 2026-06-15) is admin-panel-only (not in broker schema) — login accounts for the admin plane. Current shape in [[drizzle-schema-not-wired]]; CRUD expansion specced in `.specs/features/admin-users-crud/`.

Updated: 2026-06-15
