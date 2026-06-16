# GOTCHA: Drizzle relational queries will fail
> admin-api — `db.query.*` throws at runtime

Where: `apps/admin-api/src/modules/infra/database/drizzle/drizzle.service.ts:onModuleInit()` (L27)
calls `this.db = drizzle(this.pool)` — **no `{ schema }` arg**.

Problem:
- Field typed `db: NodePgDatabase<Schema>` (compile-time only; runtime not affected).
- Drizzle's relational query API (`db.query.<table>`) is ONLY populated when schema is passed at init. Without it, `db.query` is empty → `db.query.admins` is `undefined`.
- Verified against drizzle-orm docs (node-postgres): relational queries require `drizzle({ client, schema })` / `drizzle(client, { schema })`.

Impact:
- `DrizzleAdminsRepository.getByID()` / `getByEmail()` use `db.query.admins.findFirst()` → will throw at runtime.
- `create()` / `delete()` use core query builder (`db.insert` / `db.delete`) → these work fine without schema.
- No test currently exercises the `query` path, so it's latent.

Fix: pass the aggregated schema, e.g.
`import { schema } from "./schema"` (export the object, not just the type) then
`drizzle(this.pool, { schema })`.
Note: `schema.ts` currently only exports `type Schema` — the runtime object is local. Export it too.

Updated: 2026-06-15
