# Admin CRUD — Backend Implementation Plan (Contracts + admin-api)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared `@route-bastion/contracts` zod package and the full admins CRUD in `admin-api` (create, list with cursor pagination + name search, edit, block/unblock, physical delete), backed by unit tests and Testcontainers-based e2e tests.

**Architecture:** zod v4 schemas live in `@route-bastion/contracts` as the single source of truth; `admin-api` builds its `nestjs-zod` DTOs from those schemas. The domain follows the existing module pattern — `abstract class` repository as DI token bound to a Drizzle implementation, services returning `Result<Err, T>` tuples, domain exceptions translated to HTTP at the controller. Cursor pagination is opaque (base64url of `{createdAt,id}`), decoded/encoded in the service.

**Tech Stack:** TypeScript, NestJS 11 (Fastify), nestjs-zod 5, zod 4, Drizzle ORM (node-postgres), PostgreSQL 18 (`uuidv7()`), Vitest 4, supertest, Testcontainers.

**Spec:** `docs/superpowers/specs/2026-06-15-admin-crud-design.md`

**Conventions:** Source uses **tabs** for indentation (biome). Run all package commands from the repo root with `pnpm --filter <pkg>` unless stated. Branch: `feat/admin-crud`.

**Important deviations from a naive reading of the spec:**
- Validation failures return **HTTP 422** (`UNPROCESSABLE_ENTITY`) via the existing `ZodExceptionFilter`, not 400.
- Invalid UUID path params return **400** via Nest's `ParseUUIDPipe`.
- `DrizzleService` currently calls `drizzle(this.pool)` **without** the schema, so `db.query.*` is broken today; Task 3 wires the schema object.

---

## File Structure

**New — `apps/packages/contracts/`:**
- `package.json`, `tsconfig.build.json`
- `src/index.ts` — re-exports
- `src/admins.ts` — all admin zod schemas + inferred types
- `src/admins.spec.ts` — schema tests

**Modified — root:**
- `pnpm-workspace.yaml` — add `apps/packages/*` glob

**Modified — `apps/admin-api/`:**
- `package.json` — add `@route-bastion/contracts`, `testcontainers`, `@testcontainers/postgresql`
- `src/modules/infra/database/drizzle/enums/enums.ts` — add `adminStatusEnum`
- `src/modules/infra/database/drizzle/tables/admins.ts` — status/flags, nullable password, drop `deleted_at`
- `src/modules/infra/database/drizzle/schema.ts` — export `schema` object
- `src/modules/infra/database/drizzle/drizzle.service.ts` — wire schema
- `src/modules/admins/@types/index.ts` — domain `Admin` + repo param types
- `src/modules/admins/inputs/create.ts`, `inputs/update.ts` (new), `inputs/list-query.ts` (new)
- `src/modules/admins/outputs/admin.ts` (new, replaces `outputs/create.ts`), `outputs/list.ts` (new)
- `src/modules/admins/cursor.ts` (new) + `cursor.spec.ts`
- `src/modules/admins/admins.repository.ts` — expanded abstract class
- `src/modules/admins/admins.service.ts` + `admins.service.spec.ts`
- `src/modules/infra/database/drizzle/repositories/drizzle-admins.repository.ts` — full impl
- `src/modules/admins/admins.controller.ts` — all endpoints
- `drizzle/<generated>.sql` — new migration
- `test/e2e/global-setup.ts`, `test/e2e/setup-env.ts` (new)
- `vitest.e2e.config.ts` — globalSetup + setupFiles
- `test/admins.e2e-spec.ts` (new)

---

## Phase A — `@route-bastion/contracts`

### Task 1: Scaffold the contracts package

**Files:**
- Create: `apps/packages/contracts/package.json`
- Create: `apps/packages/contracts/tsconfig.build.json`
- Create: `apps/packages/contracts/src/index.ts`
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Add the workspace glob**

Edit `pnpm-workspace.yaml` so `packages:` includes `apps/packages/*`:

```yaml
packages:
  - "apps/*"
  - "apps/packages/*"
  - "packages/*"
allowBuilds:
  '@nestjs/core': true
  '@scarf/scarf': true
  '@swc/core': true
  bcrypt: false
  esbuild: true
```

- [ ] **Step 2: Create `apps/packages/contracts/package.json`**

```json
{
	"name": "@route-bastion/contracts",
	"version": "0.0.1",
	"private": true,
	"type": "module",
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"import": "./dist/index.js"
		}
	},
	"files": ["dist"],
	"scripts": {
		"build": "tsc -p tsconfig.build.json",
		"dev": "tsc -p tsconfig.build.json --watch",
		"test": "vitest run",
		"type-check": "tsc -p tsconfig.build.json --noEmit"
	},
	"dependencies": {
		"zod": "^4.3.6"
	},
	"devDependencies": {
		"typescript": "^5.7.3",
		"vitest": "^4.1.4"
	}
}
```

- [ ] **Step 3: Create `apps/packages/contracts/tsconfig.build.json`**

```json
{
	"compilerOptions": {
		"target": "ES2023",
		"module": "nodenext",
		"moduleResolution": "nodenext",
		"declaration": true,
		"outDir": "./dist",
		"rootDir": "./src",
		"strict": true,
		"skipLibCheck": true,
		"esModuleInterop": true,
		"forceConsistentCasingInFileNames": true
	},
	"include": ["src/**/*.ts"],
	"exclude": ["node_modules", "dist", "src/**/*.spec.ts"]
}
```

- [ ] **Step 4: Create placeholder `apps/packages/contracts/src/index.ts`**

```ts
export {};
```

- [ ] **Step 5: Install so pnpm links the workspace package**

Run: `pnpm install`
Expected: completes; `@route-bastion/contracts` recognized as a workspace package.

- [ ] **Step 6: Commit**

```bash
git add pnpm-workspace.yaml apps/packages/contracts pnpm-lock.yaml
git commit -m "feat(contracts): scaffold @route-bastion/contracts package"
```

---

### Task 2: Admin schemas + types (TDD)

**Files:**
- Create: `apps/packages/contracts/src/admins.ts`
- Create: `apps/packages/contracts/src/admins.spec.ts`
- Modify: `apps/packages/contracts/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/packages/contracts/src/admins.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
	adminOutputSchema,
	adminStatusSchema,
	createAdminInputSchema,
	listAdminsOutputSchema,
	listAdminsQuerySchema,
	updateAdminInputSchema,
} from "./admins";

describe("createAdminInputSchema", () => {
	it("accepts a valid payload without password", () => {
		const parsed = createAdminInputSchema.parse({
			name: "Ana Lima",
			email: "ana@rb.io",
			birthDate: "1990-04-12",
		});
		expect(parsed).toEqual({
			name: "Ana Lima",
			email: "ana@rb.io",
			birthDate: "1990-04-12",
		});
	});

	it("rejects an invalid email", () => {
		expect(() =>
			createAdminInputSchema.parse({
				name: "Ana",
				email: "not-an-email",
				birthDate: "1990-04-12",
			}),
		).toThrow();
	});

	it("rejects a non ISO date", () => {
		expect(() =>
			createAdminInputSchema.parse({
				name: "Ana",
				email: "ana@rb.io",
				birthDate: "12/04/1990",
			}),
		).toThrow();
	});
});

describe("adminStatusSchema", () => {
	it("accepts ACTIVE and BLOCKED", () => {
		expect(adminStatusSchema.parse("ACTIVE")).toBe("ACTIVE");
		expect(adminStatusSchema.parse("BLOCKED")).toBe("BLOCKED");
	});

	it("rejects unknown status", () => {
		expect(() => adminStatusSchema.parse("PENDING")).toThrow();
	});
});

describe("adminOutputSchema", () => {
	it("accepts a full admin with nullable fields null", () => {
		const parsed = adminOutputSchema.parse({
			id: "018f8c2a-0000-7000-8000-000000000000",
			name: "Ana",
			email: "ana@rb.io",
			birthDate: "1990-04-12",
			status: "ACTIVE",
			isPasswordCreationPending: true,
			statusChangedAt: null,
			createdAt: "2026-06-15T12:00:00.000Z",
			modifiedAt: null,
		});
		expect(parsed.status).toBe("ACTIVE");
	});
});

describe("listAdminsQuerySchema", () => {
	it("allows empty query", () => {
		expect(listAdminsQuerySchema.parse({})).toEqual({});
	});

	it("keeps cursor and search", () => {
		expect(
			listAdminsQuerySchema.parse({ cursor: "abc", search: "ana" }),
		).toEqual({ cursor: "abc", search: "ana" });
	});
});

describe("listAdminsOutputSchema", () => {
	it("accepts items + null nextCursor", () => {
		const parsed = listAdminsOutputSchema.parse({
			items: [],
			nextCursor: null,
		});
		expect(parsed.nextCursor).toBeNull();
	});
});

describe("updateAdminInputSchema", () => {
	it("requires name, email and birthDate", () => {
		expect(() => updateAdminInputSchema.parse({ name: "Ana" })).toThrow();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @route-bastion/contracts test`
Expected: FAIL — `./admins` module not found / exports undefined.

- [ ] **Step 3: Implement `apps/packages/contracts/src/admins.ts`**

```ts
import { z } from "zod";

export const adminStatusSchema = z.enum(["ACTIVE", "BLOCKED"]);
export type AdminStatus = z.infer<typeof adminStatusSchema>;

export const createAdminInputSchema = z.object({
	name: z.string().min(1),
	email: z.email(),
	birthDate: z.iso.date(),
});
export type CreateAdminInput = z.infer<typeof createAdminInputSchema>;

export const updateAdminInputSchema = z.object({
	name: z.string().min(1),
	email: z.email(),
	birthDate: z.iso.date(),
});
export type UpdateAdminInput = z.infer<typeof updateAdminInputSchema>;

export const adminOutputSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	email: z.email(),
	birthDate: z.iso.date(),
	status: adminStatusSchema,
	isPasswordCreationPending: z.boolean(),
	statusChangedAt: z.iso.datetime().nullable(),
	createdAt: z.iso.datetime(),
	modifiedAt: z.iso.datetime().nullable(),
});
export type Admin = z.infer<typeof adminOutputSchema>;

export const listAdminsQuerySchema = z.object({
	cursor: z.string().optional(),
	search: z.string().optional(),
});
export type ListAdminsQuery = z.infer<typeof listAdminsQuerySchema>;

export const listAdminsOutputSchema = z.object({
	items: z.array(adminOutputSchema),
	nextCursor: z.string().nullable(),
});
export type ListAdminsOutput = z.infer<typeof listAdminsOutputSchema>;

export const errorOutputSchema = z.object({
	error: z.string(),
});
export type ErrorOutput = z.infer<typeof errorOutputSchema>;
```

- [ ] **Step 4: Re-export from `apps/packages/contracts/src/index.ts`**

```ts
export * from "./admins";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @route-bastion/contracts test`
Expected: PASS (all describe blocks green).

- [ ] **Step 6: Build the package (admin-api consumes `dist/`)**

Run: `pnpm --filter @route-bastion/contracts build`
Expected: `apps/packages/contracts/dist/index.js` and `index.d.ts` exist.

- [ ] **Step 7: Commit**

```bash
git add apps/packages/contracts/src
git commit -m "feat(contracts): add admin zod schemas and types"
```

---

## Phase B — admin-api database layer

### Task 3: Schema changes + wiring + migration

**Files:**
- Modify: `apps/admin-api/src/modules/infra/database/drizzle/enums/enums.ts`
- Modify: `apps/admin-api/src/modules/infra/database/drizzle/tables/admins.ts`
- Modify: `apps/admin-api/src/modules/infra/database/drizzle/schema.ts`
- Modify: `apps/admin-api/src/modules/infra/database/drizzle/drizzle.service.ts`
- Create: `apps/admin-api/drizzle/<generated>.sql`

- [ ] **Step 1: Add the `admin_status` enum**

Append to `enums.ts`:

```ts
export const adminStatusEnum = pgEnum("admin_status", ["ACTIVE", "BLOCKED"]);
```

- [ ] **Step 2: Update the `admins` table**

Replace the contents of `tables/admins.ts`:

```ts
import { sql } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { adminStatusEnum } from "../enums/enums";

export const admins = pgTable("admins", {
	id: uuid("id").default(sql`uuidv7()`).primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	birthDate: timestamp("birth_date", { mode: "date" }).notNull(),
	passwordHash: text("password_hash").$type<string | null>(),
	status: adminStatusEnum("status").default("ACTIVE").notNull(),
	statusChangedAt: timestamp("status_changed_at", { mode: "date" })
		.default(sql`NULL`)
		.$type<Date | null>(),
	isPasswordCreationPending: boolean("is_password_creation_pending")
		.default(true)
		.notNull(),

	createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
	modifiedAt: timestamp("modified_at", { mode: "date" })
		.default(sql`NULL`)
		.$type<Date | null>(),
});
```

- [ ] **Step 3: Export the schema object (needed to wire Drizzle's query API)**

Replace `schema.ts`:

```ts
import { admins } from "./tables/admins";
import { apiKeys } from "./tables/api-keys";
import { constraints } from "./tables/constraints";
import { customers } from "./tables/customers";
import { providerAccessMethods } from "./tables/provider-access-methods";
import { providerConstraints } from "./tables/provider-constraints";
import { providerFeatures } from "./tables/provider-features";
import { providers } from "./tables/providers";
import { vehicles } from "./tables/vehicles";

export const schema = {
	admins,
	apiKeys,
	constraints,
	customers,
	providerAccessMethods,
	providerConstraints,
	providerFeatures,
	providers,
	vehicles,
};

export type Schema = typeof schema;
```

- [ ] **Step 4: Wire the schema into `DrizzleService`**

In `drizzle.service.ts`, change the import and the `drizzle()` call:

```ts
import { schema, type Schema } from "./schema";
```

```ts
		this.db = drizzle(this.pool, { schema });
```

(Leave the rest of the file unchanged.)

- [ ] **Step 5: Generate the migration**

Run: `cd apps/admin-api && pnpm drizzle-kit generate`
Expected: a new file in `apps/admin-api/drizzle/` whose SQL creates type `admin_status`, adds `status`, `status_changed_at`, `is_password_creation_pending`, makes `password_hash` nullable (`DROP NOT NULL`), and drops `deleted_at`.

- [ ] **Step 6: Sanity typecheck**

Run: `pnpm --filter admin-api exec tsc --noEmit -p tsconfig.json`
Expected: the database files compile (errors only where downstream code still references the old `Admin` shape are acceptable at this point — they are fixed in Task 4).

> If downstream type errors block the check, proceed; they are resolved by Task 4. Do not "fix" them here.

- [ ] **Step 7: Commit**

```bash
git add apps/admin-api/src/modules/infra/database apps/admin-api/drizzle
git commit -m "feat(admin-api): admins status/password-pending columns, drop deleted_at, wire drizzle schema"
```

---

### Task 4: Wire contracts + domain types + DTOs

**Files:**
- Modify: `apps/admin-api/package.json`
- Modify: `apps/admin-api/src/modules/admins/@types/index.ts`
- Modify: `apps/admin-api/src/modules/admins/inputs/create.ts`
- Create: `apps/admin-api/src/modules/admins/inputs/update.ts`
- Create: `apps/admin-api/src/modules/admins/inputs/list-query.ts`
- Create: `apps/admin-api/src/modules/admins/outputs/admin.ts`
- Create: `apps/admin-api/src/modules/admins/outputs/list.ts`
- Delete: `apps/admin-api/src/modules/admins/outputs/create.ts`

- [ ] **Step 1: Add the contracts dependency**

In `apps/admin-api/package.json`, add to `dependencies`:

```json
		"@route-bastion/contracts": "workspace:*",
```

Run: `pnpm install`
Expected: `admin-api` links the workspace package.

- [ ] **Step 2: Update the domain `Admin` type + repository param types**

Replace `@types/index.ts`:

```ts
import type { AdminStatus } from "@route-bastion/contracts";

export type Admin = {
	id: string;
	name: string;
	email: string;
	birthDate: Date;
	passwordHash: string | null;
	status: AdminStatus;
	statusChangedAt: Date | null;
	isPasswordCreationPending: boolean;
	createdAt: Date;
	modifiedAt: Date | null;
};

export type CreateAdminData = {
	name: string;
	email: string;
	birthDate: Date;
};

export type UpdateAdminData = {
	name: string;
	email: string;
	birthDate: Date;
	resetPassword: boolean;
};

export type AdminsCursor = {
	createdAt: Date;
	id: string;
};

export type ListAdminsParams = {
	limit: number;
	search?: string;
	cursor?: AdminsCursor;
};

export type ListAdminsResult = {
	items: Admin[];
	nextCursor: AdminsCursor | null;
};
```

- [ ] **Step 3: Rebuild DTOs from contracts**

Replace `inputs/create.ts`:

```ts
import { createAdminInputSchema } from "@route-bastion/contracts";
import { createZodDto } from "nestjs-zod";

export class CreateAdminInput extends createZodDto(createAdminInputSchema) {}
```

Create `inputs/update.ts`:

```ts
import { updateAdminInputSchema } from "@route-bastion/contracts";
import { createZodDto } from "nestjs-zod";

export class UpdateAdminInput extends createZodDto(updateAdminInputSchema) {}
```

Create `inputs/list-query.ts`:

```ts
import { listAdminsQuerySchema } from "@route-bastion/contracts";
import { createZodDto } from "nestjs-zod";

export class ListAdminsQuery extends createZodDto(listAdminsQuerySchema) {}
```

Create `outputs/admin.ts`:

```ts
import { adminOutputSchema } from "@route-bastion/contracts";
import { createZodDto } from "nestjs-zod";

export class AdminOutput extends createZodDto(adminOutputSchema) {}
```

Create `outputs/list.ts`:

```ts
import { listAdminsOutputSchema } from "@route-bastion/contracts";
import { createZodDto } from "nestjs-zod";

export class ListAdminsOutput extends createZodDto(listAdminsOutputSchema) {}
```

- [ ] **Step 4: Delete the old output**

Run: `git rm apps/admin-api/src/modules/admins/outputs/create.ts`

(The service and controller still import it; they are rewritten in Tasks 6–12. The project will not typecheck cleanly until Task 12 — that is expected for this phase.)

- [ ] **Step 5: Commit**

```bash
git add apps/admin-api/package.json apps/admin-api/src/modules/admins pnpm-lock.yaml
git commit -m "feat(admin-api): wire @route-bastion/contracts and rebuild admin DTOs"
```

---

## Phase C — admin-api domain

### Task 5: Repository abstract class + cursor codec (TDD for cursor)

**Files:**
- Modify: `apps/admin-api/src/modules/admins/admins.repository.ts`
- Create: `apps/admin-api/src/modules/admins/cursor.ts`
- Create: `apps/admin-api/src/modules/admins/cursor.spec.ts`

- [ ] **Step 1: Replace the repository abstract class**

`admins.repository.ts`:

```ts
import type { AdminStatus } from "@route-bastion/contracts";
import type {
	Admin,
	CreateAdminData,
	ListAdminsParams,
	ListAdminsResult,
	UpdateAdminData,
} from "./@types";

export abstract class AdminsRepository {
	abstract getByID(id: string): Promise<Admin | null>;
	abstract getByEmail(email: string): Promise<Admin | null>;
	abstract list(params: ListAdminsParams): Promise<ListAdminsResult>;
	abstract create(data: CreateAdminData): Promise<Admin>;
	abstract update(id: string, data: UpdateAdminData): Promise<Admin>;
	abstract delete(id: string): Promise<void>;
	abstract setStatus(id: string, status: AdminStatus): Promise<Admin>;
}
```

- [ ] **Step 2: Write the failing cursor test**

`cursor.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./cursor";

describe("cursor codec", () => {
	it("round-trips a cursor", () => {
		const cursor = {
			createdAt: new Date("2026-06-15T12:00:00.000Z"),
			id: "018f8c2a-0000-7000-8000-000000000000",
		};
		const decoded = decodeCursor(encodeCursor(cursor));
		expect(decoded).not.toBeNull();
		expect(decoded?.id).toBe(cursor.id);
		expect(decoded?.createdAt.toISOString()).toBe(
			cursor.createdAt.toISOString(),
		);
	});

	it("returns null for a malformed cursor", () => {
		expect(decodeCursor("!!!not-base64-json!!!")).toBeNull();
	});

	it("returns null for an undefined cursor", () => {
		expect(decodeCursor(undefined)).toBeNull();
	});
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter admin-api exec vitest run src/modules/admins/cursor.spec.ts`
Expected: FAIL — `./cursor` not found.

- [ ] **Step 4: Implement `cursor.ts`**

```ts
import type { AdminsCursor } from "./@types";

export function encodeCursor(cursor: AdminsCursor): string {
	const payload = JSON.stringify({
		createdAt: cursor.createdAt.toISOString(),
		id: cursor.id,
	});

	return Buffer.from(payload, "utf8").toString("base64url");
}

export function decodeCursor(raw: string | undefined): AdminsCursor | null {
	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(
			Buffer.from(raw, "base64url").toString("utf8"),
		) as { createdAt: string; id: string };

		const createdAt = new Date(parsed.createdAt);

		if (Number.isNaN(createdAt.getTime()) || typeof parsed.id !== "string") {
			return null;
		}

		return { createdAt, id: parsed.id };
	} catch {
		return null;
	}
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter admin-api exec vitest run src/modules/admins/cursor.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/admin-api/src/modules/admins/admins.repository.ts apps/admin-api/src/modules/admins/cursor.ts apps/admin-api/src/modules/admins/cursor.spec.ts
git commit -m "feat(admin-api): expand admins repository contract and add cursor codec"
```

---

### Task 6: Service `create` (TDD)

**Files:**
- Create: `apps/admin-api/src/modules/admins/admins.service.spec.ts`
- Modify: `apps/admin-api/src/modules/admins/admins.service.ts`

The spec file defines a reusable repository mock + admin factory used by all later service tasks. Later tasks **add** `describe` blocks to this same file.

- [ ] **Step 1: Write the failing test (mock + factory + create cases)**

Create `admins.service.spec.ts`:

```ts
import { AlreadyExistsException } from "@Shared/exceptions/already-exists.exception";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Admin } from "./@types";
import { AdminsRepository } from "./admins.repository";
import { AdminsService } from "./admins.service";

function makeAdmin(overrides: Partial<Admin> = {}): Admin {
	return {
		id: "018f8c2a-0000-7000-8000-000000000000",
		name: "Ana Lima",
		email: "ana@rb.io",
		birthDate: new Date("1990-04-12T00:00:00.000Z"),
		passwordHash: null,
		status: "ACTIVE",
		statusChangedAt: null,
		isPasswordCreationPending: true,
		createdAt: new Date("2026-06-15T12:00:00.000Z"),
		modifiedAt: null,
		...overrides,
	};
}

function makeRepo(): AdminsRepository {
	return {
		getByID: vi.fn(),
		getByEmail: vi.fn(),
		list: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		setStatus: vi.fn(),
	} as unknown as AdminsRepository;
}

describe("AdminsService.create", () => {
	let repo: AdminsRepository;
	let service: AdminsService;

	beforeEach(() => {
		repo = makeRepo();
		service = new AdminsService(repo);
	});

	it("rejects a duplicate email with AlreadyExistsException", async () => {
		vi.mocked(repo.getByEmail).mockResolvedValue(makeAdmin());

		const [error, output] = await service.create({
			name: "Ana",
			email: "ana@rb.io",
			birthDate: "1990-04-12",
		});

		expect(output).toBeNull();
		expect(error).toBeInstanceOf(AlreadyExistsException);
		expect(repo.create).not.toHaveBeenCalled();
	});

	it("creates an admin without a password and maps the output", async () => {
		vi.mocked(repo.getByEmail).mockResolvedValue(null);
		vi.mocked(repo.create).mockResolvedValue(makeAdmin());

		const [error, output] = await service.create({
			name: "Ana Lima",
			email: "ana@rb.io",
			birthDate: "1990-04-12",
		});

		expect(error).toBeNull();
		expect(repo.create).toHaveBeenCalledWith({
			name: "Ana Lima",
			email: "ana@rb.io",
			birthDate: new Date("1990-04-12"),
		});
		expect(output).toEqual({
			id: "018f8c2a-0000-7000-8000-000000000000",
			name: "Ana Lima",
			email: "ana@rb.io",
			birthDate: "1990-04-12",
			status: "ACTIVE",
			isPasswordCreationPending: true,
			statusChangedAt: null,
			createdAt: "2026-06-15T12:00:00.000Z",
			modifiedAt: null,
		});
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter admin-api exec vitest run src/modules/admins/admins.service.spec.ts`
Expected: FAIL — current `AdminsService` signatures/`toOutput` don't match.

- [ ] **Step 3: Implement the service (create + shared mapper)**

Replace `admins.service.ts`:

```ts
import { AlreadyExistsException } from "@Shared/exceptions/already-exists.exception";
import { NotFoundException } from "@Shared/exceptions/not-found.exception";
import { Result } from "@Types/result";
import { Injectable } from "@nestjs/common";
import type { Admin as AdminOutputDto } from "@route-bastion/contracts";
import type { Admin } from "./@types";
import { AdminsRepository } from "./admins.repository";
import { CreateAdminInput } from "./inputs/create";

@Injectable()
export class AdminsService {
	constructor(private readonly repository: AdminsRepository) {}

	async create(
		input: CreateAdminInput,
	): Promise<Result<AlreadyExistsException, AdminOutputDto>> {
		const exists = await this.repository.getByEmail(input.email);

		if (exists) {
			return [
				new AlreadyExistsException("Admin with this email already exists"),
				null,
			];
		}

		const created = await this.repository.create({
			name: input.name,
			email: input.email,
			birthDate: new Date(input.birthDate),
		});

		return [null, toOutput(created)];
	}
}

function toOutput(admin: Admin): AdminOutputDto {
	return {
		id: admin.id,
		name: admin.name,
		email: admin.email,
		birthDate: admin.birthDate.toISOString().slice(0, 10),
		status: admin.status,
		isPasswordCreationPending: admin.isPasswordCreationPending,
		statusChangedAt: admin.statusChangedAt?.toISOString() ?? null,
		createdAt: admin.createdAt.toISOString(),
		modifiedAt: admin.modifiedAt?.toISOString() ?? null,
	};
}
```

Keep the `NotFoundException` import — it is used by later tasks.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter admin-api exec vitest run src/modules/admins/admins.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin-api/src/modules/admins/admins.service.ts apps/admin-api/src/modules/admins/admins.service.spec.ts
git commit -m "feat(admin-api): admins service create without password"
```

---

### Task 7: Service `list` (TDD)

**Files:**
- Modify: `apps/admin-api/src/modules/admins/admins.service.spec.ts`
- Modify: `apps/admin-api/src/modules/admins/admins.service.ts`

- [ ] **Step 1: Add the failing test**

Append to `admins.service.spec.ts`:

```ts
import { encodeCursor } from "./cursor";

describe("AdminsService.list", () => {
	let repo: AdminsRepository;
	let service: AdminsService;

	beforeEach(() => {
		repo = makeRepo();
		service = new AdminsService(repo);
	});

	it("asks the repository for 10 items and forwards the search term", async () => {
		vi.mocked(repo.list).mockResolvedValue({ items: [], nextCursor: null });

		const output = await service.list({ search: "ana" });

		expect(repo.list).toHaveBeenCalledWith({
			limit: 10,
			search: "ana",
			cursor: undefined,
		});
		expect(output).toEqual({ items: [], nextCursor: null });
	});

	it("decodes the incoming cursor and encodes the next cursor", async () => {
		const next = {
			createdAt: new Date("2026-06-10T00:00:00.000Z"),
			id: "018f8c2a-0000-7000-8000-000000000111",
		};
		vi.mocked(repo.list).mockResolvedValue({
			items: [makeAdmin()],
			nextCursor: next,
		});

		const incoming = encodeCursor({
			createdAt: new Date("2026-06-15T12:00:00.000Z"),
			id: "018f8c2a-0000-7000-8000-000000000000",
		});

		const output = await service.list({ cursor: incoming });

		expect(vi.mocked(repo.list).mock.calls[0][0].cursor).toEqual({
			createdAt: new Date("2026-06-15T12:00:00.000Z"),
			id: "018f8c2a-0000-7000-8000-000000000000",
		});
		expect(output.items).toHaveLength(1);
		expect(output.nextCursor).toBe(encodeCursor(next));
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter admin-api exec vitest run src/modules/admins/admins.service.spec.ts -t "AdminsService.list"`
Expected: FAIL — `service.list` is not a function.

- [ ] **Step 3: Implement `list`**

Add imports at the top of `admins.service.ts`:

```ts
import type {
	ListAdminsOutput,
	ListAdminsQuery,
} from "@route-bastion/contracts";
import { decodeCursor, encodeCursor } from "./cursor";
```

Add the method inside the `AdminsService` class:

```ts
	async list(query: ListAdminsQuery): Promise<ListAdminsOutput> {
		const cursor = query.cursor ? decodeCursor(query.cursor) : null;

		const result = await this.repository.list({
			limit: 10,
			search: query.search,
			cursor: cursor ?? undefined,
		});

		return {
			items: result.items.map(toOutput),
			nextCursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
		};
	}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter admin-api exec vitest run src/modules/admins/admins.service.spec.ts -t "AdminsService.list"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin-api/src/modules/admins/admins.service.ts apps/admin-api/src/modules/admins/admins.service.spec.ts
git commit -m "feat(admin-api): admins service list with cursor pagination"
```

---

### Task 8: Service `update` (TDD)

**Files:**
- Modify: `apps/admin-api/src/modules/admins/admins.service.spec.ts`
- Modify: `apps/admin-api/src/modules/admins/admins.service.ts`

- [ ] **Step 1: Add the failing test**

Append to `admins.service.spec.ts`:

```ts
import { NotFoundException } from "@Shared/exceptions/not-found.exception";

describe("AdminsService.update", () => {
	let repo: AdminsRepository;
	let service: AdminsService;

	beforeEach(() => {
		repo = makeRepo();
		service = new AdminsService(repo);
	});

	const input = {
		name: "Ana Updated",
		email: "ana@rb.io",
		birthDate: "1990-04-12",
	};

	it("returns NotFoundException when the admin does not exist", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(null);

		const [error, output] = await service.update("missing-id", input);

		expect(output).toBeNull();
		expect(error).toBeInstanceOf(NotFoundException);
		expect(repo.update).not.toHaveBeenCalled();
	});

	it("returns AlreadyExistsException when the new email belongs to another admin", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(makeAdmin({ email: "old@rb.io" }));
		vi.mocked(repo.getByEmail).mockResolvedValue(
			makeAdmin({ id: "another-id", email: "ana@rb.io" }),
		);

		const [error] = await service.update("018f8c2a-0000-7000-8000-000000000000", input);

		expect(error).toBeInstanceOf(AlreadyExistsException);
		expect(repo.update).not.toHaveBeenCalled();
	});

	it("resets the password when the email changes", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(makeAdmin({ email: "old@rb.io" }));
		vi.mocked(repo.getByEmail).mockResolvedValue(null);
		vi.mocked(repo.update).mockResolvedValue(
			makeAdmin({ email: "ana@rb.io", isPasswordCreationPending: true }),
		);

		const [error] = await service.update("018f8c2a-0000-7000-8000-000000000000", input);

		expect(error).toBeNull();
		expect(repo.update).toHaveBeenCalledWith(
			"018f8c2a-0000-7000-8000-000000000000",
			{
				name: "Ana Updated",
				email: "ana@rb.io",
				birthDate: new Date("1990-04-12"),
				resetPassword: true,
			},
		);
	});

	it("preserves the password when only name/birthDate change", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(makeAdmin({ email: "ana@rb.io" }));
		vi.mocked(repo.update).mockResolvedValue(makeAdmin());

		await service.update("018f8c2a-0000-7000-8000-000000000000", input);

		expect(repo.update).toHaveBeenCalledWith(
			"018f8c2a-0000-7000-8000-000000000000",
			expect.objectContaining({ resetPassword: false }),
		);
		expect(repo.getByEmail).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter admin-api exec vitest run src/modules/admins/admins.service.spec.ts -t "AdminsService.update"`
Expected: FAIL — `service.update` is not a function.

- [ ] **Step 3: Implement `update`**

Add the import for `UpdateAdminInput` at the top of `admins.service.ts`:

```ts
import { UpdateAdminInput } from "./inputs/update";
```

Add the method inside the class:

```ts
	async update(
		id: string,
		input: UpdateAdminInput,
	): Promise<Result<AlreadyExistsException | NotFoundException, AdminOutputDto>> {
		const existing = await this.repository.getByID(id);

		if (!existing) {
			return [new NotFoundException("Admin not found"), null];
		}

		const emailChanged = input.email !== existing.email;

		if (emailChanged) {
			const emailOwner = await this.repository.getByEmail(input.email);

			if (emailOwner && emailOwner.id !== id) {
				return [
					new AlreadyExistsException("Admin with this email already exists"),
					null,
				];
			}
		}

		const updated = await this.repository.update(id, {
			name: input.name,
			email: input.email,
			birthDate: new Date(input.birthDate),
			resetPassword: emailChanged,
		});

		return [null, toOutput(updated)];
	}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter admin-api exec vitest run src/modules/admins/admins.service.spec.ts -t "AdminsService.update"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin-api/src/modules/admins/admins.service.ts apps/admin-api/src/modules/admins/admins.service.spec.ts
git commit -m "feat(admin-api): admins service update with email-change password reset"
```

---

### Task 9: Service `block`/`unblock` (TDD)

**Files:**
- Modify: `apps/admin-api/src/modules/admins/admins.service.spec.ts`
- Modify: `apps/admin-api/src/modules/admins/admins.service.ts`

- [ ] **Step 1: Add the failing test**

Append to `admins.service.spec.ts`:

```ts
describe("AdminsService.block / unblock", () => {
	let repo: AdminsRepository;
	let service: AdminsService;
	const id = "018f8c2a-0000-7000-8000-000000000000";

	beforeEach(() => {
		repo = makeRepo();
		service = new AdminsService(repo);
	});

	it("blocks an existing admin", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(makeAdmin());
		vi.mocked(repo.setStatus).mockResolvedValue(makeAdmin({ status: "BLOCKED" }));

		const [error, output] = await service.block(id);

		expect(error).toBeNull();
		expect(repo.setStatus).toHaveBeenCalledWith(id, "BLOCKED");
		expect(output?.status).toBe("BLOCKED");
	});

	it("unblocks an existing admin", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(makeAdmin({ status: "BLOCKED" }));
		vi.mocked(repo.setStatus).mockResolvedValue(makeAdmin({ status: "ACTIVE" }));

		const [error, output] = await service.unblock(id);

		expect(error).toBeNull();
		expect(repo.setStatus).toHaveBeenCalledWith(id, "ACTIVE");
		expect(output?.status).toBe("ACTIVE");
	});

	it("returns NotFoundException when blocking a missing admin", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(null);

		const [error] = await service.block(id);

		expect(error).toBeInstanceOf(NotFoundException);
		expect(repo.setStatus).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter admin-api exec vitest run src/modules/admins/admins.service.spec.ts -t "block / unblock"`
Expected: FAIL — `service.block` is not a function.

- [ ] **Step 3: Implement `block`/`unblock`**

Add inside the class:

```ts
	async block(
		id: string,
	): Promise<Result<NotFoundException, AdminOutputDto>> {
		return this.setStatus(id, "BLOCKED");
	}

	async unblock(
		id: string,
	): Promise<Result<NotFoundException, AdminOutputDto>> {
		return this.setStatus(id, "ACTIVE");
	}

	private async setStatus(
		id: string,
		status: "ACTIVE" | "BLOCKED",
	): Promise<Result<NotFoundException, AdminOutputDto>> {
		const existing = await this.repository.getByID(id);

		if (!existing) {
			return [new NotFoundException("Admin not found"), null];
		}

		const updated = await this.repository.setStatus(id, status);

		return [null, toOutput(updated)];
	}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter admin-api exec vitest run src/modules/admins/admins.service.spec.ts -t "block / unblock"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin-api/src/modules/admins/admins.service.ts apps/admin-api/src/modules/admins/admins.service.spec.ts
git commit -m "feat(admin-api): admins service block/unblock"
```

---

### Task 10: Service `delete` (TDD)

**Files:**
- Modify: `apps/admin-api/src/modules/admins/admins.service.spec.ts`
- Modify: `apps/admin-api/src/modules/admins/admins.service.ts`

- [ ] **Step 1: Add the failing test**

Append to `admins.service.spec.ts`:

```ts
describe("AdminsService.delete", () => {
	let repo: AdminsRepository;
	let service: AdminsService;
	const id = "018f8c2a-0000-7000-8000-000000000000";

	beforeEach(() => {
		repo = makeRepo();
		service = new AdminsService(repo);
	});

	it("returns NotFoundException for a missing admin", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(null);

		const [error] = await service.delete(id);

		expect(error).toBeInstanceOf(NotFoundException);
		expect(repo.delete).not.toHaveBeenCalled();
	});

	it("deletes an existing admin", async () => {
		vi.mocked(repo.getByID).mockResolvedValue(makeAdmin());

		const [error, value] = await service.delete(id);

		expect(error).toBeNull();
		expect(value).toBeNull();
		expect(repo.delete).toHaveBeenCalledWith(id);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter admin-api exec vitest run src/modules/admins/admins.service.spec.ts -t "AdminsService.delete"`
Expected: FAIL — current `delete` returns the old shape / mismatched mock.

- [ ] **Step 3: Implement `delete`**

Add inside the class (replace any pre-existing `delete`):

```ts
	async delete(id: string): Promise<Result<NotFoundException, null>> {
		const existing = await this.repository.getByID(id);

		if (!existing) {
			return [new NotFoundException("Admin not found"), null];
		}

		await this.repository.delete(id);

		return [null, null];
	}
```

- [ ] **Step 4: Run all service tests**

Run: `pnpm --filter admin-api exec vitest run src/modules/admins/admins.service.spec.ts`
Expected: PASS (create, list, update, block/unblock, delete).

- [ ] **Step 5: Commit**

```bash
git add apps/admin-api/src/modules/admins/admins.service.ts apps/admin-api/src/modules/admins/admins.service.spec.ts
git commit -m "feat(admin-api): admins service physical delete"
```

---

### Task 11: Drizzle repository implementation

**Files:**
- Modify: `apps/admin-api/src/modules/infra/database/drizzle/repositories/drizzle-admins.repository.ts`

(Covered end-to-end by the e2e suite in Task 14.)

- [ ] **Step 1: Replace the repository implementation**

```ts
import type { AdminStatus } from "@route-bastion/contracts";
import type {
	Admin,
	CreateAdminData,
	ListAdminsParams,
	ListAdminsResult,
	UpdateAdminData,
} from "@Modules/admins/@types";
import { AdminsRepository } from "@Modules/admins/admins.repository";
import { Injectable } from "@nestjs/common";
import { and, desc, eq, ilike, lt, or } from "drizzle-orm";
import { DrizzleService } from "../drizzle.service";
import { admins } from "../tables/admins";

@Injectable()
export class DrizzleAdminsRepository extends AdminsRepository {
	constructor(private readonly drizzle: DrizzleService) {
		super();
	}

	async getByID(id: string): Promise<Admin | null> {
		const [admin] = await this.drizzle.db
			.select()
			.from(admins)
			.where(eq(admins.id, id))
			.limit(1);

		return admin ?? null;
	}

	async getByEmail(email: string): Promise<Admin | null> {
		const [admin] = await this.drizzle.db
			.select()
			.from(admins)
			.where(eq(admins.email, email))
			.limit(1);

		return admin ?? null;
	}

	async list(params: ListAdminsParams): Promise<ListAdminsResult> {
		const conditions = [];

		if (params.search) {
			conditions.push(ilike(admins.name, `%${params.search}%`));
		}

		if (params.cursor) {
			conditions.push(
				or(
					lt(admins.createdAt, params.cursor.createdAt),
					and(
						eq(admins.createdAt, params.cursor.createdAt),
						lt(admins.id, params.cursor.id),
					),
				),
			);
		}

		const rows = await this.drizzle.db
			.select()
			.from(admins)
			.where(conditions.length ? and(...conditions) : undefined)
			.orderBy(desc(admins.createdAt), desc(admins.id))
			.limit(params.limit + 1);

		const hasMore = rows.length > params.limit;
		const items = hasMore ? rows.slice(0, params.limit) : rows;
		const last = items.at(-1);

		const nextCursor =
			hasMore && last ? { createdAt: last.createdAt, id: last.id } : null;

		return { items, nextCursor };
	}

	async create(data: CreateAdminData): Promise<Admin> {
		const [created] = await this.drizzle.db
			.insert(admins)
			.values({
				name: data.name,
				email: data.email,
				birthDate: data.birthDate,
			})
			.returning();

		return created;
	}

	async update(id: string, data: UpdateAdminData): Promise<Admin> {
		const values: Partial<typeof admins.$inferInsert> = {
			name: data.name,
			email: data.email,
			birthDate: data.birthDate,
			modifiedAt: new Date(),
		};

		if (data.resetPassword) {
			values.passwordHash = null;
			values.isPasswordCreationPending = true;
		}

		const [updated] = await this.drizzle.db
			.update(admins)
			.set(values)
			.where(eq(admins.id, id))
			.returning();

		return updated;
	}

	async delete(id: string): Promise<void> {
		await this.drizzle.db.delete(admins).where(eq(admins.id, id));
	}

	async setStatus(id: string, status: AdminStatus): Promise<Admin> {
		const [updated] = await this.drizzle.db
			.update(admins)
			.set({ status, statusChangedAt: new Date() })
			.where(eq(admins.id, id))
			.returning();

		return updated;
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin-api/src/modules/infra/database/drizzle/repositories/drizzle-admins.repository.ts
git commit -m "feat(admin-api): drizzle admins repository (list/update/delete/setStatus)"
```

---

### Task 12: Controller endpoints + typecheck

**Files:**
- Modify: `apps/admin-api/src/modules/admins/admins.controller.ts`

- [ ] **Step 1: Replace the controller**

```ts
import { ErrorOutput } from "@Shared/http/outputs/error";
import { AlreadyExistsException } from "@Shared/exceptions/already-exists.exception";
import {
	Body,
	ConflictException,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	NotFoundException,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Put,
	Query,
} from "@nestjs/common";
import {
	ApiConflictResponse,
	ApiNoContentResponse,
	ApiNotFoundResponse,
	ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { AdminsService } from "./admins.service";
import { CreateAdminInput } from "./inputs/create";
import { ListAdminsQuery } from "./inputs/list-query";
import { UpdateAdminInput } from "./inputs/update";
import { AdminOutput } from "./outputs/admin";
import { ListAdminsOutput } from "./outputs/list";

@Controller("admins")
@ApiTags("admins")
export class AdminsController {
	constructor(private readonly service: AdminsService) {}

	@Post()
	@ZodResponse({
		status: HttpStatus.CREATED,
		type: AdminOutput,
		description: "Successfully created a new admin",
	})
	@ApiConflictResponse({
		type: ErrorOutput.Output,
		description: "An admin with the provided email already exists",
	})
	async create(@Body() input: CreateAdminInput): Promise<AdminOutput> {
		const [error, output] = await this.service.create(input);

		if (error) {
			throw new ConflictException({ error: error.message });
		}

		return output;
	}

	@Get()
	@ZodResponse({
		status: HttpStatus.OK,
		type: ListAdminsOutput,
		description: "Paginated list of admins",
	})
	async list(@Query() query: ListAdminsQuery): Promise<ListAdminsOutput> {
		return this.service.list(query);
	}

	@Put(":id")
	@ZodResponse({
		status: HttpStatus.OK,
		type: AdminOutput,
		description: "Successfully updated the admin",
	})
	@ApiNotFoundResponse({
		type: ErrorOutput.Output,
		description: "No admin found with the provided ID",
	})
	@ApiConflictResponse({
		type: ErrorOutput.Output,
		description: "An admin with the provided email already exists",
	})
	async update(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() input: UpdateAdminInput,
	): Promise<AdminOutput> {
		const [error, output] = await this.service.update(id, input);

		if (error) {
			if (error instanceof AlreadyExistsException) {
				throw new ConflictException({ error: error.message });
			}

			throw new NotFoundException({ error: error.message });
		}

		return output;
	}

	@Patch(":id/block")
	@ZodResponse({
		status: HttpStatus.OK,
		type: AdminOutput,
		description: "Successfully blocked the admin",
	})
	@ApiNotFoundResponse({
		type: ErrorOutput.Output,
		description: "No admin found with the provided ID",
	})
	async block(@Param("id", ParseUUIDPipe) id: string): Promise<AdminOutput> {
		const [error, output] = await this.service.block(id);

		if (error) {
			throw new NotFoundException({ error: error.message });
		}

		return output;
	}

	@Patch(":id/unblock")
	@ZodResponse({
		status: HttpStatus.OK,
		type: AdminOutput,
		description: "Successfully unblocked the admin",
	})
	@ApiNotFoundResponse({
		type: ErrorOutput.Output,
		description: "No admin found with the provided ID",
	})
	async unblock(@Param("id", ParseUUIDPipe) id: string): Promise<AdminOutput> {
		const [error, output] = await this.service.unblock(id);

		if (error) {
			throw new NotFoundException({ error: error.message });
		}

		return output;
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiNoContentResponse({ description: "Successfully deleted the admin" })
	@ApiNotFoundResponse({
		type: ErrorOutput.Output,
		description: "No admin found with the provided ID",
	})
	async delete(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
		const [error] = await this.service.delete(id);

		if (error) {
			throw new NotFoundException({ error: error.message });
		}
	}
}
```

> Note: `ErrorOutput.Output` is the existing pattern used in the current controller for swagger response typing. Keep it as-is.

- [ ] **Step 2: Full typecheck (the whole module must compile now)**

Run: `pnpm --filter admin-api exec tsc --noEmit -p tsconfig.json`
Expected: PASS (no type errors).

- [ ] **Step 3: Run all unit tests**

Run: `pnpm --filter admin-api test`
Expected: PASS (service + cursor specs).

- [ ] **Step 4: Commit**

```bash
git add apps/admin-api/src/modules/admins/admins.controller.ts
git commit -m "feat(admin-api): admins controller CRUD + block/unblock endpoints"
```

---

## Phase D — e2e with Testcontainers

### Task 13: e2e infrastructure

**Files:**
- Modify: `apps/admin-api/package.json`
- Create: `apps/admin-api/test/e2e/global-setup.ts`
- Create: `apps/admin-api/test/e2e/setup-env.ts`
- Modify: `apps/admin-api/vitest.e2e.config.ts`

- [ ] **Step 1: Add the Testcontainers dev dependencies**

In `apps/admin-api/package.json` `devDependencies` add:

```json
		"@testcontainers/postgresql": "^11.0.0",
		"testcontainers": "^11.0.0",
```

Run: `pnpm install`
Expected: both packages installed.

- [ ] **Step 2: Create the global setup (one container per e2e run)**

`apps/admin-api/test/e2e/global-setup.ts`:

```ts
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import type { GlobalSetupContext } from "vitest/node";

declare module "vitest" {
	export interface ProvidedContext {
		databaseUrl: string;
	}
}

let container: StartedPostgreSqlContainer;

export async function setup({ provide }: GlobalSetupContext) {
	container = await new PostgreSqlContainer("postgres:18").start();

	const databaseUrl = container.getConnectionUri();

	const pool = new Pool({ connectionString: databaseUrl });
	const db = drizzle(pool);
	await migrate(db, { migrationsFolder: "./drizzle" });
	await pool.end();

	provide("databaseUrl", databaseUrl);
}

export async function teardown() {
	await container?.stop();
}
```

- [ ] **Step 3: Create the per-worker env setup**

`apps/admin-api/test/e2e/setup-env.ts`:

```ts
import { inject } from "vitest";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = inject("databaseUrl");
process.env.REDIS_HOST = "localhost";
process.env.REDIS_PORT = "6379";
process.env.REDIS_PASSWORD = "test";
```

> Why both files: env (`src/modules/config/env`) reads `process.env` at import time and `process.exit(1)`s if `REDIS_*`/`DATABASE_URL` are missing. `setupFiles` run in each worker **before** the test file imports `AppModule`, so the env is valid by then. `dotenv/config` does not override already-set vars, so these win.

- [ ] **Step 4: Update `vitest.e2e.config.ts`**

```ts
import swc from "unplugin-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["**/*.e2e-spec.ts"],
		globals: true,
		root: "./",
		globalSetup: ["./test/e2e/global-setup.ts"],
		setupFiles: ["./test/e2e/setup-env.ts"],
		fileParallelism: false,
		testTimeout: 30000,
		hookTimeout: 120000,
	},
	plugins: [tsconfigPaths(), swc.vite()],
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/admin-api/package.json apps/admin-api/test/e2e apps/admin-api/vitest.e2e.config.ts pnpm-lock.yaml
git commit -m "test(admin-api): testcontainers postgres:18 e2e harness"
```

---

### Task 14: admins e2e spec

**Files:**
- Create: `apps/admin-api/test/admins.e2e-spec.ts`

- [ ] **Step 1: Write the e2e spec**

`apps/admin-api/test/admins.e2e-spec.ts`:

```ts
import {
	FastifyAdapter,
	type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { Pool } from "pg";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";

let app: NestFastifyApplication;
let pool: Pool;

async function createAdmin(overrides: Record<string, unknown> = {}) {
	return request(app.getHttpServer())
		.post("/admins")
		.send({
			name: "Ana Lima",
			email: `ana-${Math.random().toString(36).slice(2)}@rb.io`,
			birthDate: "1990-04-12",
			...overrides,
		});
}

beforeAll(async () => {
	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	app = moduleRef.createNestApplication<NestFastifyApplication>(
		new FastifyAdapter(),
	);
	await app.init();
	await app.getHttpAdapter().getInstance().ready();

	pool = new Pool({ connectionString: process.env.DATABASE_URL });
});

afterAll(async () => {
	await pool.end();
	await app.close();
});

beforeEach(async () => {
	await pool.query("TRUNCATE admins RESTART IDENTITY CASCADE");
});

describe("admins e2e", () => {
	it("creates an admin without a password (201, pending password)", async () => {
		const res = await createAdmin({ email: "ana@rb.io" });

		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({
			name: "Ana Lima",
			email: "ana@rb.io",
			birthDate: "1990-04-12",
			status: "ACTIVE",
			isPasswordCreationPending: true,
			statusChangedAt: null,
			modifiedAt: null,
		});
		expect(res.body.id).toBeDefined();
	});

	it("rejects a duplicate email with 409", async () => {
		await createAdmin({ email: "dup@rb.io" });
		const res = await createAdmin({ email: "dup@rb.io" });

		expect(res.status).toBe(409);
		expect(res.body.error).toContain("email");
	});

	it("rejects invalid input with 422", async () => {
		const res = await request(app.getHttpServer())
			.post("/admins")
			.send({ name: "", email: "nope", birthDate: "12/04/1990" });

		expect(res.status).toBe(422);
	});

	it("lists newest-first with cursor pagination of 10", async () => {
		for (let i = 0; i < 12; i++) {
			await createAdmin({ name: `Admin ${i}`, email: `a${i}@rb.io` });
		}

		const first = await request(app.getHttpServer()).get("/admins");
		expect(first.status).toBe(200);
		expect(first.body.items).toHaveLength(10);
		expect(first.body.nextCursor).not.toBeNull();

		const second = await request(app.getHttpServer())
			.get("/admins")
			.query({ cursor: first.body.nextCursor });
		expect(second.body.items).toHaveLength(2);
		expect(second.body.nextCursor).toBeNull();

		const firstIds = first.body.items.map((a: { id: string }) => a.id);
		const secondIds = second.body.items.map((a: { id: string }) => a.id);
		expect(firstIds.filter((id: string) => secondIds.includes(id))).toHaveLength(0);
	});

	it("searches by name (case-insensitive)", async () => {
		await createAdmin({ name: "Beatriz", email: "b@rb.io" });
		await createAdmin({ name: "Carlos", email: "c@rb.io" });

		const res = await request(app.getHttpServer())
			.get("/admins")
			.query({ search: "bea" });

		expect(res.body.items).toHaveLength(1);
		expect(res.body.items[0].name).toBe("Beatriz");
	});

	it("updates name/birthDate and preserves email; 404 for missing", async () => {
		const created = await createAdmin({ email: "edit@rb.io" });
		const id = created.body.id;

		const res = await request(app.getHttpServer())
			.put(`/admins/${id}`)
			.send({ name: "Ana Editada", email: "edit@rb.io", birthDate: "1991-01-01" });

		expect(res.status).toBe(200);
		expect(res.body.name).toBe("Ana Editada");
		expect(res.body.birthDate).toBe("1991-01-01");
		expect(res.body.modifiedAt).not.toBeNull();

		const missing = await request(app.getHttpServer())
			.put("/admins/018f8c2a-0000-7000-8000-0000000000ff")
			.send({ name: "X", email: "x@rb.io", birthDate: "1991-01-01" });
		expect(missing.status).toBe(404);
	});

	it("resets password pending flag when email changes", async () => {
		const created = await createAdmin({ email: "old@rb.io" });
		const id = created.body.id;

		// simulate that the admin already set a password
		await pool.query(
			"UPDATE admins SET password_hash = 'hash', is_password_creation_pending = false WHERE id = $1",
			[id],
		);

		const res = await request(app.getHttpServer())
			.put(`/admins/${id}`)
			.send({ name: "Ana Lima", email: "new@rb.io", birthDate: "1990-04-12" });

		expect(res.status).toBe(200);
		expect(res.body.email).toBe("new@rb.io");
		expect(res.body.isPasswordCreationPending).toBe(true);

		const { rows } = await pool.query(
			"SELECT password_hash FROM admins WHERE id = $1",
			[id],
		);
		expect(rows[0].password_hash).toBeNull();
	});

	it("blocks and unblocks an admin", async () => {
		const created = await createAdmin({ email: "status@rb.io" });
		const id = created.body.id;

		const blocked = await request(app.getHttpServer()).patch(`/admins/${id}/block`);
		expect(blocked.status).toBe(200);
		expect(blocked.body.status).toBe("BLOCKED");
		expect(blocked.body.statusChangedAt).not.toBeNull();

		const unblocked = await request(app.getHttpServer()).patch(`/admins/${id}/unblock`);
		expect(unblocked.status).toBe(200);
		expect(unblocked.body.status).toBe("ACTIVE");
	});

	it("physically deletes an admin (204) and 404 afterwards on re-delete", async () => {
		const created = await createAdmin({ email: "del@rb.io" });
		const id = created.body.id;

		const del = await request(app.getHttpServer()).delete(`/admins/${id}`);
		expect(del.status).toBe(204);

		const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM admins WHERE id = $1", [id]);
		expect(rows[0].c).toBe(0);

		const again = await request(app.getHttpServer()).delete(`/admins/${id}`);
		expect(again.status).toBe(404);
	});
});
```

- [ ] **Step 2: Run the e2e suite (Docker must be running)**

Run: `pnpm --filter admin-api test:e2e`
Expected: PASS — container boots `postgres:18`, migrations apply, all cases green.

- [ ] **Step 3: Commit**

```bash
git add apps/admin-api/test/admins.e2e-spec.ts
git commit -m "test(admin-api): admins CRUD e2e suite"
```

---

## Definition of Done

- [ ] `pnpm --filter @route-bastion/contracts test` passes; `build` emits `dist/`.
- [ ] `pnpm --filter admin-api exec tsc --noEmit -p tsconfig.json` passes.
- [ ] `pnpm --filter admin-api test` passes (service + cursor unit tests).
- [ ] `pnpm --filter admin-api test:e2e` passes against `postgres:18` via Testcontainers.
- [ ] Endpoints behave per spec: `POST 201`, `GET 200` (cursor 10/page, `created_at DESC`, `ILIKE` search), `PUT 200` (email change → password reset), `PATCH block/unblock 200`, `DELETE 204`; `409` dup email, `404` missing, `422` invalid body.

---

## Self-Review notes (author)

- **Spec coverage:** schema changes (Task 3), contracts package (Tasks 1–2, 4), endpoints + rules (Tasks 6–12), Testcontainers e2e (Tasks 13–14), unit tests (Tasks 6–10), cursor pagination (Tasks 5, 7, 11, 14). Frontend + contracts schema-tests-on-FE are out of scope for this plan (Plan 2).
- **Status-code correction:** validation = 422 (filter), not 400 — reflected in e2e Task 14.
- **Type consistency:** `Admin` (domain, `@types`) vs `Admin` (contracts output) are intentionally distinct; the service imports the contracts one aliased as `AdminOutputDto`. Repo param types (`CreateAdminData`/`UpdateAdminData`/`ListAdminsParams`/`ListAdminsResult`/`AdminsCursor`) are defined once in `@types` and used by repo interface, impl, and service.
- **Coverage target (≥80%):** met by unit + e2e; run `pnpm --filter admin-api test:cov` to confirm if needed.
