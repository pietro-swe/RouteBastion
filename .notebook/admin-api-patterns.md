# admin-api Patterns
> NestJS (Fastify) conventions — control plane API

Entry: `src/main.ts:bootstrap()` — Fastify adapter, listens 0.0.0.0:PORT. Swagger only in `development` via `modules/config/docs:init()`.
Root wiring: `src/app.module.ts` — ConfigModule (global, `skipProcessEnv`, loads env fn), DatabaseModule, UsersModule.
Env: `modules/config/env/index.ts` — Zod-validated `process.env`, `process.exit(1)` on invalid. Exports typed `Env`.

Module pattern (canonical example = `modules/users/`):
- **Abstract class as repository DI token**: `users.repository.ts` declares `abstract class UsersRepository`. Bound to impl in `infra/database/database.module.ts` via `{ provide: UsersRepository, useClass: DrizzleUsersRepository }`. Domain module imports DatabaseModule, depends on the abstract.
- Folders: `inputs/` (request DTOs), `outputs/` (response DTOs), `@types/` (domain types), `exceptions/`.
- **DTOs via nestjs-zod**: `class X extends createZodDto(zodSchema)`. e.g. `inputs/create.ts`.
- **Result tuples, not throws**: services return `Result<Err, T>` = `[error, null] | [null, value]` (`src/@types/result.ts`). Controller destructures `[error, output]` and maps domain exceptions → Nest HTTP exceptions. See `users.service.ts` + `users.controller.ts`.
- **Domain exceptions**: `src/shared/exceptions/` (AlreadyExistsException, NotFoundException) — plain Errors, translated to HTTP at controller (ConflictException, NotFoundException).

Global providers (app.module.ts): APP_PIPE=ZodValidationPipe, APP_INTERCEPTOR=ZodSerializerInterceptor, APP_FILTER=ZodExceptionFilter (`infra/http/filters/`).

DB layer: Drizzle + node-postgres `Pool`. `infra/database/drizzle/drizzle.service.ts` opens pool from `DATABASE_URL` on `onModuleInit`. Tables in `drizzle/tables/*`, aggregated in `drizzle/schema.ts`. Migrations dir `drizzle/`, drizzle-kit config `drizzle.config.ts` (snake_case casing). ⚠ schema not passed to drizzle() — see [[drizzle-schema-not-wired]]

Path aliases (`tsconfig.json`): `@Types`, `@Shared`, `@Modules`, `@Infra`, `@DB`, `@HTTP`.
Tests: Vitest (`vitest.config.ts`); e2e via `vitest.e2e.config.ts` (supertest, `*.e2e-spec.ts`).

Current state: users module = create + delete only. `auth/` module dirs exist but are EMPTY. CRUD expansion specced in `.specs/features/admin-users-crud/`.

Updated: 2026-06-15
