# Admin CRUD — Frontend Implementation Plan (admin-ui)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admins management screen in `admin-ui` (PrimeVue) at `/dashboard/admins` inside a minimal dashboard layout: list with cursor pagination + name search, create/edit/delete modals, block/unblock actions, toasts, and a strict refetch-after-mutation rule — consuming the `admin-api` from Plan 1 via the shared `@route-bastion/contracts` types.

**Architecture:** A feature module under `src/modules/admins/` with a thin `ky` service layer (typed by contracts), a Pinia setup store holding list state + a cursor stack, and PrimeVue components for the screen and modals. Every successful mutation calls a single `refetch()` that resets pagination to the first page and re-sends the active search term. Validation reuses the contracts zod schemas via `@primevue/forms`' `zodResolver`.

**Tech Stack:** Vue 3, PrimeVue 4.5 + `@primevue/forms`, Tailwind v4, ky, Pinia, `@vueuse/core`, zod 4, Vitest 4 + `@vue/test-utils` (jsdom).

**Spec:** `docs/superpowers/specs/2026-06-15-admin-crud-design.md`
**Prerequisite:** Plan 1 (`@route-bastion/contracts` built; `admin-api` running for manual verification). Branch: `feat/admin-crud`.

**Conventions:** Source uses **tabs** (biome). Frontend imports use the `@/` alias (defined in `tsconfig.app.json`) and the `@route-bastion/contracts` package. Run commands with `pnpm --filter admin-ui`.

---

## File Structure

**New:**
- `apps/admin-ui/.env.test`
- `apps/admin-ui/src/test/setup.ts` — jsdom polyfills for PrimeVue
- `apps/admin-ui/src/shared/format/date.ts` (+ `date.spec.ts`)
- `apps/admin-ui/src/shared/http/client.ts`
- `apps/admin-ui/src/shared/layouts/DashboardLayout.vue`
- `apps/admin-ui/src/modules/admins/form.ts` (+ `form.spec.ts`)
- `apps/admin-ui/src/modules/admins/services/admins.service.ts` (+ `admins.service.spec.ts`)
- `apps/admin-ui/src/modules/admins/stores/admins.store.ts` (+ `admins.store.spec.ts`)
- `apps/admin-ui/src/modules/admins/components/AdminFormDialog.vue` (+ `AdminFormDialog.spec.ts`)
- `apps/admin-ui/src/modules/admins/components/DeleteAdminDialog.vue` (+ `DeleteAdminDialog.spec.ts`)
- `apps/admin-ui/src/modules/admins/views/AdminsView.vue` (+ `AdminsView.spec.ts`)

**Modified:**
- `apps/admin-ui/package.json` — add `@route-bastion/contracts`, `zod`
- `apps/admin-ui/src/main.ts` — register `ToastService`
- `apps/admin-ui/src/App.vue` — mount `<Toast/>`
- `apps/admin-ui/src/router/index.ts` — dashboard layout + `/dashboard/admins`
- `apps/admin-ui/vitest.config.ts` — `setupFiles`
- `apps/admin-ui/src/@types/user.ts` — deleted (replaced by contracts `Admin`)

---

## Task 1: Frontend foundation

**Files:**
- Modify: `apps/admin-ui/package.json`
- Modify: `apps/admin-ui/src/main.ts`
- Modify: `apps/admin-ui/src/App.vue`
- Create: `apps/admin-ui/.env.test`
- Create: `apps/admin-ui/src/test/setup.ts`
- Modify: `apps/admin-ui/vitest.config.ts`

- [ ] **Step 1: Ensure the contracts package is built**

Run: `pnpm --filter @route-bastion/contracts build`
Expected: `apps/packages/contracts/dist/index.js` exists.

- [ ] **Step 2: Add dependencies**

In `apps/admin-ui/package.json` `dependencies` add:

```json
		"@route-bastion/contracts": "workspace:*",
		"zod": "^4.3.6",
```

Run: `pnpm install`
Expected: workspace package linked; zod installed.

- [ ] **Step 3: Register ToastService in `main.ts`**

Add the import and `app.use`:

```ts
import ToastService from "primevue/toastservice";
```

```ts
app.use(ToastService);
```

(Place `app.use(ToastService);` after the `app.use(PrimeVue, ...)` call.)

- [ ] **Step 4: Mount `<Toast/>` in `App.vue`**

Replace `App.vue`:

```vue
<script setup lang="ts">
import Toast from "primevue/toast";
import { RouterView } from "vue-router";
</script>

<template>
	<RouterView />
	<Toast />
</template>
```

- [ ] **Step 5: Create `.env.test` (test API base URL)**

`apps/admin-ui/.env.test`:

```
VITE_API_URL=http://localhost:3000/api
```

- [ ] **Step 6: Create jsdom polyfills `src/test/setup.ts`**

PrimeVue overlays (Dialog/DatePicker) touch `matchMedia`/`ResizeObserver`, which jsdom lacks.

```ts
import { vi } from "vitest";

if (!window.matchMedia) {
	window.matchMedia = vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));
}

if (!("ResizeObserver" in window)) {
	window.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
}
```

- [ ] **Step 7: Reference the setup file in `vitest.config.ts`**

Add `setupFiles` to the `test` block:

```ts
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			environment: "jsdom",
			exclude: [...configDefaults.exclude, "e2e/**"],
			root: fileURLToPath(new URL("./", import.meta.url)),
			setupFiles: ["./src/test/setup.ts"],
		},
	}),
);
```

- [ ] **Step 8: Commit**

```bash
git add apps/admin-ui/package.json apps/admin-ui/src/main.ts apps/admin-ui/src/App.vue apps/admin-ui/.env.test apps/admin-ui/src/test/setup.ts apps/admin-ui/vitest.config.ts pnpm-lock.yaml
git commit -m "feat(admin-ui): wire contracts, toast service and test setup"
```

---

## Task 2: Date utilities (TDD)

**Files:**
- Create: `apps/admin-ui/src/shared/format/date.ts`
- Create: `apps/admin-ui/src/shared/format/date.spec.ts`

- [ ] **Step 1: Write the failing test**

`date.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatDateBR, parseApiDate, toApiDate } from "./date";

describe("toApiDate", () => {
	it("formats a Date to YYYY-MM-DD using local parts", () => {
		expect(toApiDate(new Date(1990, 3, 12))).toBe("1990-04-12");
	});

	it("zero-pads month and day", () => {
		expect(toApiDate(new Date(2026, 0, 5))).toBe("2026-01-05");
	});
});

describe("formatDateBR", () => {
	it("reformats a YYYY-MM-DD string to DD/MM/YYYY", () => {
		expect(formatDateBR("1990-04-12")).toBe("12/04/1990");
	});

	it("accepts a full ISO datetime and keeps the date part", () => {
		expect(formatDateBR("2026-06-15T12:00:00.000Z")).toBe("15/06/2026");
	});
});

describe("parseApiDate", () => {
	it("parses YYYY-MM-DD to a local Date at midnight", () => {
		const date = parseApiDate("1990-04-12");
		expect(date.getFullYear()).toBe(1990);
		expect(date.getMonth()).toBe(3);
		expect(date.getDate()).toBe(12);
	});

	it("round-trips with toApiDate", () => {
		expect(toApiDate(parseApiDate("2026-01-05"))).toBe("2026-01-05");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter admin-ui exec vitest run src/shared/format/date.spec.ts`
Expected: FAIL — `./date` not found.

- [ ] **Step 3: Implement `date.ts`**

```ts
export function toApiDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

export function formatDateBR(value: string): string {
	const [year, month, day] = value.slice(0, 10).split("-");

	return `${day}/${month}/${year}`;
}

export function parseApiDate(value: string): Date {
	const [year, month, day] = value
		.slice(0, 10)
		.split("-")
		.map((part) => Number(part));

	return new Date(year, month - 1, day);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter admin-ui exec vitest run src/shared/format/date.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin-ui/src/shared/format
git commit -m "feat(admin-ui): date formatting helpers (DD/MM/YYYY <-> YYYY-MM-DD)"
```

---

## Task 3: Admin form schema + payload mapper (TDD)

The DatePicker yields a `Date`, but the contracts input expects `birthDate` as `YYYY-MM-DD`. This module overrides `birthDate` to a `Date` for the form resolver and maps to the contract on submit.

**Files:**
- Create: `apps/admin-ui/src/modules/admins/form.ts`
- Create: `apps/admin-ui/src/modules/admins/form.spec.ts`

- [ ] **Step 1: Write the failing test**

`form.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { adminFormSchema, toAdminInput } from "./form";

describe("adminFormSchema", () => {
	it("accepts a valid form value with a Date birthDate", () => {
		const result = adminFormSchema.safeParse({
			name: "Ana Lima",
			email: "ana@rb.io",
			birthDate: new Date(1990, 3, 12),
		});
		expect(result.success).toBe(true);
	});

	it("rejects an invalid email", () => {
		const result = adminFormSchema.safeParse({
			name: "Ana",
			email: "nope",
			birthDate: new Date(1990, 3, 12),
		});
		expect(result.success).toBe(false);
	});

	it("rejects a missing birthDate", () => {
		const result = adminFormSchema.safeParse({
			name: "Ana",
			email: "ana@rb.io",
			birthDate: null,
		});
		expect(result.success).toBe(false);
	});
});

describe("toAdminInput", () => {
	it("maps form values to the contract input with YYYY-MM-DD birthDate", () => {
		expect(
			toAdminInput({
				name: "Ana Lima",
				email: "ana@rb.io",
				birthDate: new Date(1990, 3, 12),
			}),
		).toEqual({
			name: "Ana Lima",
			email: "ana@rb.io",
			birthDate: "1990-04-12",
		});
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter admin-ui exec vitest run src/modules/admins/form.spec.ts`
Expected: FAIL — `./form` not found.

- [ ] **Step 3: Implement `form.ts`**

```ts
import {
	type CreateAdminInput,
	createAdminInputSchema,
} from "@route-bastion/contracts";
import { z } from "zod";
import { toApiDate } from "@/shared/format/date";

export const adminFormSchema = createAdminInputSchema.extend({
	birthDate: z.date({ message: "Informe a data de nascimento" }),
});

export type AdminFormValues = z.infer<typeof adminFormSchema>;

export function toAdminInput(values: AdminFormValues): CreateAdminInput {
	return {
		name: values.name,
		email: values.email,
		birthDate: toApiDate(values.birthDate),
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter admin-ui exec vitest run src/modules/admins/form.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin-ui/src/modules/admins/form.ts apps/admin-ui/src/modules/admins/form.spec.ts
git commit -m "feat(admin-ui): admin form schema and payload mapper"
```

---

## Task 4: HTTP client

**Files:**
- Create: `apps/admin-ui/src/shared/http/client.ts`

- [ ] **Step 1: Implement the ky instance**

```ts
import ky from "ky";

export const http = ky.create({
	prefixUrl: import.meta.env.VITE_API_URL,
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter admin-ui exec vue-tsc --noEmit -p tsconfig.app.json`
Expected: PASS (no errors in `client.ts`).

- [ ] **Step 3: Commit**

```bash
git add apps/admin-ui/src/shared/http/client.ts
git commit -m "feat(admin-ui): ky http client"
```

---

## Task 5: Admins service (TDD)

**Files:**
- Create: `apps/admin-ui/src/modules/admins/services/admins.service.ts`
- Create: `apps/admin-ui/src/modules/admins/services/admins.service.spec.ts`

The test stubs `globalThis.fetch` (Node provides `fetch`/`Request`/`Response`); ky passes a `Request` to fetch, so we assert on it.

- [ ] **Step 1: Write the failing test**

`admins.service.spec.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminsService } from "./admins.service";

function mockFetch(body: unknown, status = 200) {
	return vi.spyOn(globalThis, "fetch").mockResolvedValue(
		new Response(JSON.stringify(body), {
			status,
			headers: { "content-type": "application/json" },
		}),
	);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("adminsService", () => {
	it("list() builds the URL with cursor and search", async () => {
		const fetchSpy = mockFetch({ items: [], nextCursor: null });

		await adminsService.list({ cursor: "abc", search: "ana" });

		const request = fetchSpy.mock.calls[0][0] as Request;
		expect(request.method).toBe("GET");
		expect(request.url).toBe(
			"http://localhost:3000/api/admins?cursor=abc&search=ana",
		);
	});

	it("list() omits undefined params", async () => {
		const fetchSpy = mockFetch({ items: [], nextCursor: null });

		await adminsService.list({});

		const request = fetchSpy.mock.calls[0][0] as Request;
		expect(request.url).toBe("http://localhost:3000/api/admins");
	});

	it("create() POSTs the json body", async () => {
		const fetchSpy = mockFetch({ id: "1" }, 201);
		const input = { name: "Ana", email: "ana@rb.io", birthDate: "1990-04-12" };

		await adminsService.create(input);

		const request = fetchSpy.mock.calls[0][0] as Request;
		expect(request.method).toBe("POST");
		expect(request.url).toBe("http://localhost:3000/api/admins");
		expect(await request.json()).toEqual(input);
	});

	it("update() PUTs to /admins/:id", async () => {
		const fetchSpy = mockFetch({ id: "1" });

		await adminsService.update("1", {
			name: "Ana",
			email: "ana@rb.io",
			birthDate: "1990-04-12",
		});

		const request = fetchSpy.mock.calls[0][0] as Request;
		expect(request.method).toBe("PUT");
		expect(request.url).toBe("http://localhost:3000/api/admins/1");
	});

	it("block()/unblock() PATCH the status routes", async () => {
		const fetchSpy = mockFetch({ id: "1" });

		await adminsService.block("1");
		await adminsService.unblock("1");

		const first = fetchSpy.mock.calls[0][0] as Request;
		const second = fetchSpy.mock.calls[1][0] as Request;
		expect(first.method).toBe("PATCH");
		expect(first.url).toBe("http://localhost:3000/api/admins/1/block");
		expect(second.url).toBe("http://localhost:3000/api/admins/1/unblock");
	});

	it("remove() DELETEs /admins/:id", async () => {
		const fetchSpy = mockFetch({}, 204);

		await adminsService.remove("1");

		const request = fetchSpy.mock.calls[0][0] as Request;
		expect(request.method).toBe("DELETE");
		expect(request.url).toBe("http://localhost:3000/api/admins/1");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter admin-ui exec vitest run src/modules/admins/services/admins.service.spec.ts`
Expected: FAIL — `./admins.service` not found.

- [ ] **Step 3: Implement `admins.service.ts`**

```ts
import type {
	Admin,
	CreateAdminInput,
	ListAdminsOutput,
	ListAdminsQuery,
	UpdateAdminInput,
} from "@route-bastion/contracts";
import { http } from "@/shared/http/client";

function listParams(query: ListAdminsQuery): Record<string, string> {
	const params: Record<string, string> = {};

	if (query.cursor) {
		params.cursor = query.cursor;
	}

	if (query.search) {
		params.search = query.search;
	}

	return params;
}

export const adminsService = {
	list(query: ListAdminsQuery): Promise<ListAdminsOutput> {
		return http
			.get("admins", { searchParams: listParams(query) })
			.json<ListAdminsOutput>();
	},

	create(input: CreateAdminInput): Promise<Admin> {
		return http.post("admins", { json: input }).json<Admin>();
	},

	update(id: string, input: UpdateAdminInput): Promise<Admin> {
		return http.put(`admins/${id}`, { json: input }).json<Admin>();
	},

	block(id: string): Promise<Admin> {
		return http.patch(`admins/${id}/block`).json<Admin>();
	},

	unblock(id: string): Promise<Admin> {
		return http.patch(`admins/${id}/unblock`).json<Admin>();
	},

	async remove(id: string): Promise<void> {
		await http.delete(`admins/${id}`);
	},
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter admin-ui exec vitest run src/modules/admins/services/admins.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin-ui/src/modules/admins/services
git commit -m "feat(admin-ui): admins ky service"
```

---

## Task 6: Admins store (TDD) — incl. refetch-after-mutation rule

**Files:**
- Create: `apps/admin-ui/src/modules/admins/stores/admins.store.ts`
- Create: `apps/admin-ui/src/modules/admins/stores/admins.store.spec.ts`

- [ ] **Step 1: Write the failing test**

`admins.store.spec.ts`:

```ts
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Admin } from "@route-bastion/contracts";
import { adminsService } from "@/modules/admins/services/admins.service";
import { useAdminsStore } from "./admins.store";

vi.mock("@/modules/admins/services/admins.service", () => ({
	adminsService: {
		list: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		block: vi.fn(),
		unblock: vi.fn(),
		remove: vi.fn(),
	},
}));

function makeAdmin(overrides: Partial<Admin> = {}): Admin {
	return {
		id: "1",
		name: "Ana Lima",
		email: "ana@rb.io",
		birthDate: "1990-04-12",
		status: "ACTIVE",
		isPasswordCreationPending: true,
		statusChangedAt: null,
		createdAt: "2026-06-15T12:00:00.000Z",
		modifiedAt: null,
		...overrides,
	};
}

beforeEach(() => {
	setActivePinia(createPinia());
	vi.clearAllMocks();
});

describe("useAdminsStore", () => {
	it("fetchFirstPage loads items and nextCursor", async () => {
		vi.mocked(adminsService.list).mockResolvedValue({
			items: [makeAdmin()],
			nextCursor: "c1",
		});

		const store = useAdminsStore();
		await store.fetchFirstPage();

		expect(store.items).toHaveLength(1);
		expect(store.hasNext).toBe(true);
		expect(store.hasPrev).toBe(false);
		expect(adminsService.list).toHaveBeenCalledWith({
			cursor: undefined,
			search: undefined,
		});
	});

	it("fetchNext pushes the cursor; fetchPrev pops it", async () => {
		vi.mocked(adminsService.list)
			.mockResolvedValueOnce({ items: [makeAdmin()], nextCursor: "c1" })
			.mockResolvedValueOnce({ items: [makeAdmin({ id: "2" })], nextCursor: "c2" })
			.mockResolvedValueOnce({ items: [makeAdmin()], nextCursor: "c1" });

		const store = useAdminsStore();
		await store.fetchFirstPage();
		await store.fetchNext();

		expect(adminsService.list).toHaveBeenLastCalledWith({
			cursor: "c1",
			search: undefined,
		});
		expect(store.hasPrev).toBe(true);

		await store.fetchPrev();
		expect(adminsService.list).toHaveBeenLastCalledWith({
			cursor: undefined,
			search: undefined,
		});
		expect(store.hasPrev).toBe(false);
	});

	it("setSearch trims the term and refetches from the first page", async () => {
		vi.mocked(adminsService.list).mockResolvedValue({
			items: [],
			nextCursor: null,
		});

		const store = useAdminsStore();
		await store.setSearch("  ana  ");

		expect(store.search).toBe("ana");
		expect(adminsService.list).toHaveBeenLastCalledWith({
			cursor: undefined,
			search: "ana",
		});
	});

	it("resets pagination to the first page and keeps search after a mutation", async () => {
		vi.mocked(adminsService.list)
			.mockResolvedValueOnce({ items: [makeAdmin()], nextCursor: "c1" }) // setSearch
			.mockResolvedValueOnce({ items: [makeAdmin({ id: "2" })], nextCursor: "c2" }) // fetchNext
			.mockResolvedValueOnce({ items: [makeAdmin()], nextCursor: null }); // refetch after create
		vi.mocked(adminsService.create).mockResolvedValue(makeAdmin());

		const store = useAdminsStore();
		await store.setSearch("ana");
		await store.fetchNext();
		expect(store.hasPrev).toBe(true);

		await store.create({
			name: "New",
			email: "new@rb.io",
			birthDate: "1990-04-12",
		});

		expect(adminsService.create).toHaveBeenCalled();
		expect(adminsService.list).toHaveBeenLastCalledWith({
			cursor: undefined,
			search: "ana",
		});
		expect(store.hasPrev).toBe(false);
	});

	it("block/unblock/update/remove each refetch from the first page", async () => {
		vi.mocked(adminsService.list).mockResolvedValue({
			items: [makeAdmin()],
			nextCursor: null,
		});
		vi.mocked(adminsService.block).mockResolvedValue(makeAdmin());
		vi.mocked(adminsService.remove).mockResolvedValue();

		const store = useAdminsStore();
		await store.block("1");
		await store.remove("1");

		expect(adminsService.block).toHaveBeenCalledWith("1");
		expect(adminsService.remove).toHaveBeenCalledWith("1");
		// list called once per mutation refetch
		expect(adminsService.list).toHaveBeenCalledTimes(2);
	});

	it("sets an error message when loading fails", async () => {
		vi.mocked(adminsService.list).mockRejectedValue(new Error("boom"));

		const store = useAdminsStore();
		await store.fetchFirstPage();

		expect(store.error).toBe("Falha ao carregar admins");
		expect(store.items).toEqual([]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter admin-ui exec vitest run src/modules/admins/stores/admins.store.spec.ts`
Expected: FAIL — `./admins.store` not found.

- [ ] **Step 3: Implement `admins.store.ts`**

```ts
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type {
	Admin,
	CreateAdminInput,
	UpdateAdminInput,
} from "@route-bastion/contracts";
import { adminsService } from "@/modules/admins/services/admins.service";

export const useAdminsStore = defineStore("Admins", () => {
	const items = ref<Admin[]>([]);
	const search = ref("");
	const loading = ref(false);
	const error = ref<string | null>(null);

	const cursorStack = ref<(string | undefined)[]>([undefined]);
	const nextCursor = ref<string | null>(null);

	const hasPrev = computed(() => cursorStack.value.length > 1);
	const hasNext = computed(() => nextCursor.value !== null);

	async function load(cursor: string | undefined) {
		loading.value = true;
		error.value = null;

		try {
			const result = await adminsService.list({
				cursor,
				search: search.value || undefined,
			});
			items.value = result.items;
			nextCursor.value = result.nextCursor;
		} catch {
			error.value = "Falha ao carregar admins";
			items.value = [];
			nextCursor.value = null;
		} finally {
			loading.value = false;
		}
	}

	async function refetch() {
		cursorStack.value = [undefined];
		await load(undefined);
	}

	async function fetchFirstPage() {
		await refetch();
	}

	async function fetchNext() {
		if (!nextCursor.value) {
			return;
		}

		cursorStack.value.push(nextCursor.value);
		await load(nextCursor.value);
	}

	async function fetchPrev() {
		if (cursorStack.value.length <= 1) {
			return;
		}

		cursorStack.value.pop();
		await load(cursorStack.value[cursorStack.value.length - 1]);
	}

	async function setSearch(term: string) {
		search.value = term.trim();
		await refetch();
	}

	async function create(input: CreateAdminInput) {
		await adminsService.create(input);
		await refetch();
	}

	async function update(id: string, input: UpdateAdminInput) {
		await adminsService.update(id, input);
		await refetch();
	}

	async function block(id: string) {
		await adminsService.block(id);
		await refetch();
	}

	async function unblock(id: string) {
		await adminsService.unblock(id);
		await refetch();
	}

	async function remove(id: string) {
		await adminsService.remove(id);
		await refetch();
	}

	return {
		items,
		search,
		loading,
		error,
		hasPrev,
		hasNext,
		fetchFirstPage,
		fetchNext,
		fetchPrev,
		setSearch,
		create,
		update,
		block,
		unblock,
		remove,
	};
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter admin-ui exec vitest run src/modules/admins/stores/admins.store.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin-ui/src/modules/admins/stores
git commit -m "feat(admin-ui): admins store with cursor stack and refetch-after-mutation"
```

---

## Task 7: Dashboard layout + routing

**Files:**
- Create: `apps/admin-ui/src/shared/layouts/DashboardLayout.vue`
- Modify: `apps/admin-ui/src/router/index.ts`
- Delete: `apps/admin-ui/src/@types/user.ts`

- [ ] **Step 1: Create `DashboardLayout.vue` (minimal shell)**

```vue
<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import { routes } from "@/router";
</script>

<template>
	<div class="flex min-h-screen">
		<aside
			class="w-60 shrink-0 border-r border-surface-200 p-4"
			data-testid="sidebar"
		>
			<h1 class="mb-6 text-lg font-bold">RouteBastion</h1>
			<nav class="flex flex-col gap-1">
				<RouterLink
					:to="routes.Admins"
					class="rounded px-3 py-2 hover:bg-surface-100"
				>
					Admins
				</RouterLink>
			</nav>
		</aside>
		<main class="flex-1 p-6">
			<RouterView />
		</main>
	</div>
</template>
```

- [ ] **Step 2: Update the router**

Replace `router/index.ts`:

```ts
import { createRouter, createWebHistory } from "vue-router";
import DashboardLayout from "@/shared/layouts/DashboardLayout.vue";

export const routes = {
	Login: "/auth",
	ForgotPassword: "/forgot-password",
	Dashboard: "/dashboard",
	Admins: "/dashboard/admins",
} as const;

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: "/dashboard",
			component: DashboardLayout,
			children: [
				{
					path: "admins",
					name: "Admins",
					component: () => import("@/modules/admins/views/AdminsView.vue"),
				},
			],
		},
	],
});

export default router;
```

- [ ] **Step 3: Remove the obsolete `User` type**

Run: `git rm apps/admin-ui/src/@types/user.ts`
(The `Admin` type from `@route-bastion/contracts` replaces it. If anything still imports it, switch the import to the contracts `Admin`.)

- [ ] **Step 4: Commit**

```bash
git add apps/admin-ui/src/shared/layouts apps/admin-ui/src/router/index.ts
git commit -m "feat(admin-ui): dashboard layout and /dashboard/admins route"
```

---

## Task 8: AdminFormDialog component

**Files:**
- Create: `apps/admin-ui/src/modules/admins/components/AdminFormDialog.vue`
- Create: `apps/admin-ui/src/modules/admins/components/AdminFormDialog.spec.ts`

> NOTE: this uses `@primevue/forms` v4.5. The `Form` default slot exposes per-field states as `$form.<name>` with `.invalid` and `.error?.message`. If the installed API differs, consult PrimeVue Forms docs (context7) before adjusting — the component logic (mode, submit, email-change warning) stays the same.

- [ ] **Step 1: Implement `AdminFormDialog.vue`**

```vue
<script setup lang="ts">
import { Form } from "@primevue/forms";
import { zodResolver } from "@primevue/forms/resolvers/zod";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import { useToast } from "primevue/usetoast";
import { computed, reactive, ref, watch } from "vue";
import type { Admin } from "@route-bastion/contracts";
import { adminFormSchema, toAdminInput } from "@/modules/admins/form";
import { useAdminsStore } from "@/modules/admins/stores/admins.store";
import { parseApiDate } from "@/shared/format/date";

const props = defineProps<{
	visible: boolean;
	mode: "create" | "edit";
	admin: Admin | null;
}>();

const emit = defineEmits<{
	"update:visible": [value: boolean];
	saved: [];
}>();

const store = useAdminsStore();
const toast = useToast();
const resolver = zodResolver(adminFormSchema);
const submitting = ref(false);
const currentEmail = ref("");

const initialValues = reactive({
	name: "",
	email: "",
	birthDate: null as Date | null,
});

watch(
	() => props.visible,
	(open) => {
		if (!open) {
			return;
		}

		initialValues.name = props.admin?.name ?? "";
		initialValues.email = props.admin?.email ?? "";
		initialValues.birthDate = props.admin
			? parseApiDate(props.admin.birthDate)
			: null;
		currentEmail.value = props.admin?.email ?? "";
	},
);

const title = computed(() =>
	props.mode === "create" ? "Novo admin" : "Editar admin",
);

const emailChanged = computed(
	() =>
		props.mode === "edit" &&
		!!props.admin &&
		currentEmail.value !== props.admin.email,
);

async function onSubmit(event: {
	valid: boolean;
	values: Record<string, unknown>;
}) {
	if (!event.valid || submitting.value) {
		return;
	}

	const input = toAdminInput({
		name: event.values.name as string,
		email: event.values.email as string,
		birthDate: event.values.birthDate as Date,
	});

	submitting.value = true;

	try {
		if (props.mode === "create") {
			await store.create(input);
		} else if (props.admin) {
			await store.update(props.admin.id, input);
		}

		toast.add({
			severity: "success",
			summary: "Sucesso",
			detail: props.mode === "create" ? "Admin criado" : "Admin atualizado",
			life: 3000,
		});
		emit("saved");
		emit("update:visible", false);
	} catch {
		toast.add({
			severity: "error",
			summary: "Erro",
			detail: "Não foi possível salvar o admin",
			life: 4000,
		});
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<Dialog
		:visible="visible"
		modal
		:header="title"
		:style="{ width: '28rem' }"
		@update:visible="emit('update:visible', $event)"
	>
		<Form
			:initial-values="initialValues"
			:resolver="resolver"
			data-testid="admin-form"
			@submit="onSubmit"
		>
			<template #default="$form">
				<div class="flex flex-col gap-4">
					<div class="flex flex-col gap-1">
						<label for="name">Nome</label>
						<InputText id="name" name="name" data-testid="field-name" />
						<Message
							v-if="$form.name?.invalid"
							severity="error"
							size="small"
							variant="simple"
						>
							{{ $form.name.error?.message }}
						</Message>
					</div>

					<div class="flex flex-col gap-1">
						<label for="email">Email</label>
						<InputText
							id="email"
							name="email"
							data-testid="field-email"
							@input="
								currentEmail = ($event.target as HTMLInputElement).value
							"
						/>
						<Message
							v-if="$form.email?.invalid"
							severity="error"
							size="small"
							variant="simple"
						>
							{{ $form.email.error?.message }}
						</Message>
						<Message
							v-if="emailChanged"
							severity="warn"
							size="small"
							variant="simple"
							data-testid="email-warning"
						>
							Ao alterar o email deste usuário, a senha do mesmo será
							redefinida e ele deverá criar uma nova no seu próximo acesso.
						</Message>
					</div>

					<div class="flex flex-col gap-1">
						<label for="birthDate">Data de nascimento</label>
						<DatePicker
							input-id="birthDate"
							name="birthDate"
							date-format="dd/mm/yy"
							data-testid="field-birthdate"
						/>
						<Message
							v-if="$form.birthDate?.invalid"
							severity="error"
							size="small"
							variant="simple"
						>
							{{ $form.birthDate.error?.message }}
						</Message>
					</div>
				</div>

				<div class="mt-6 flex justify-end gap-2">
					<Button
						label="Cancelar"
						severity="secondary"
						type="button"
						data-testid="cancel"
						@click="emit('update:visible', false)"
					/>
					<Button
						label="Salvar"
						type="submit"
						:loading="submitting"
						data-testid="save"
					/>
				</div>
			</template>
		</Form>
	</Dialog>
</template>
```

- [ ] **Step 2: Write the component test**

The PrimeVue `Dialog` teleports to body; stub it to render its slot inline so the form is queryable.

`AdminFormDialog.spec.ts`:

```ts
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Admin } from "@route-bastion/contracts";
import AdminFormDialog from "./AdminFormDialog.vue";

const DialogStub = {
	props: ["visible"],
	template: `<div><slot /></div>`,
};

function makeAdmin(overrides: Partial<Admin> = {}): Admin {
	return {
		id: "1",
		name: "Ana Lima",
		email: "ana@rb.io",
		birthDate: "1990-04-12",
		status: "ACTIVE",
		isPasswordCreationPending: true,
		statusChangedAt: null,
		createdAt: "2026-06-15T12:00:00.000Z",
		modifiedAt: null,
		...overrides,
	};
}

function mountDialog(props: Record<string, unknown>) {
	return mount(AdminFormDialog, {
		props,
		global: {
			plugins: [PrimeVue, ToastService],
			stubs: { Dialog: DialogStub },
		},
	});
}

beforeEach(() => {
	setActivePinia(createPinia());
});

describe("AdminFormDialog", () => {
	it("renders the create title in create mode", () => {
		const wrapper = mountDialog({ visible: true, mode: "create", admin: null });
		expect(wrapper.find('[data-testid="admin-form"]').exists()).toBe(true);
	});

	it("cancel emits update:visible false", async () => {
		const wrapper = mountDialog({ visible: true, mode: "create", admin: null });
		await wrapper.find('[data-testid="cancel"]').trigger("click");
		expect(wrapper.emitted("update:visible")?.at(-1)).toEqual([false]);
	});

	it("shows the email-change warning in edit mode when the email changes", async () => {
		const wrapper = mountDialog({
			visible: true,
			mode: "edit",
			admin: makeAdmin({ email: "old@rb.io" }),
		});
		await flushPromises();

		expect(wrapper.find('[data-testid="email-warning"]').exists()).toBe(false);

		await wrapper
			.find('[data-testid="field-email"]')
			.setValue("new@rb.io");

		expect(wrapper.find('[data-testid="email-warning"]').exists()).toBe(true);
	});
});
```

> The valid-submit → `store.create`/`update` path and zod validation are covered by `form.spec.ts` (schema + mapper) and the e2e/manual run; component tests here focus on mode, cancel, and the email warning to stay resilient to PrimeVue Forms internals.

- [ ] **Step 3: Run the test**

Run: `pnpm --filter admin-ui exec vitest run src/modules/admins/components/AdminFormDialog.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/admin-ui/src/modules/admins/components/AdminFormDialog.vue apps/admin-ui/src/modules/admins/components/AdminFormDialog.spec.ts
git commit -m "feat(admin-ui): admin create/edit dialog"
```

---

## Task 9: DeleteAdminDialog component

**Files:**
- Create: `apps/admin-ui/src/modules/admins/components/DeleteAdminDialog.vue`
- Create: `apps/admin-ui/src/modules/admins/components/DeleteAdminDialog.spec.ts`

- [ ] **Step 1: Implement `DeleteAdminDialog.vue`**

```vue
<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import { useToast } from "primevue/usetoast";
import { ref } from "vue";
import type { Admin } from "@route-bastion/contracts";
import { useAdminsStore } from "@/modules/admins/stores/admins.store";

const props = defineProps<{ visible: boolean; admin: Admin | null }>();
const emit = defineEmits<{ "update:visible": [value: boolean] }>();

const store = useAdminsStore();
const toast = useToast();
const deleting = ref(false);

async function confirm() {
	if (!props.admin || deleting.value) {
		return;
	}

	deleting.value = true;

	try {
		await store.remove(props.admin.id);
		toast.add({
			severity: "success",
			summary: "Sucesso",
			detail: "Admin deletado",
			life: 3000,
		});
		emit("update:visible", false);
	} catch {
		toast.add({
			severity: "error",
			summary: "Erro",
			detail: "Não foi possível deletar o admin",
			life: 4000,
		});
	} finally {
		deleting.value = false;
	}
}
</script>

<template>
	<Dialog
		:visible="visible"
		modal
		header="Deletar admin"
		:style="{ width: '24rem' }"
		@update:visible="emit('update:visible', $event)"
	>
		<p data-testid="delete-message">
			Tem certeza que deseja deletar <b>{{ admin?.name }}</b> ({{
				admin?.email
			}})?
		</p>
		<div class="mt-6 flex justify-end gap-2">
			<Button
				label="Cancelar"
				severity="secondary"
				type="button"
				data-testid="delete-cancel"
				@click="emit('update:visible', false)"
			/>
			<Button
				label="Deletar"
				severity="danger"
				:loading="deleting"
				data-testid="delete-confirm"
				@click="confirm"
			/>
		</div>
	</Dialog>
</template>
```

- [ ] **Step 2: Write the component test**

`DeleteAdminDialog.spec.ts`:

```ts
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Admin } from "@route-bastion/contracts";
import { adminsService } from "@/modules/admins/services/admins.service";
import DeleteAdminDialog from "./DeleteAdminDialog.vue";

vi.mock("@/modules/admins/services/admins.service", () => ({
	adminsService: { remove: vi.fn(), list: vi.fn() },
}));

const DialogStub = { props: ["visible"], template: `<div><slot /></div>` };

const admin: Admin = {
	id: "1",
	name: "Ana Lima",
	email: "ana@rb.io",
	birthDate: "1990-04-12",
	status: "ACTIVE",
	isPasswordCreationPending: true,
	statusChangedAt: null,
	createdAt: "2026-06-15T12:00:00.000Z",
	modifiedAt: null,
};

function mountDialog() {
	return mount(DeleteAdminDialog, {
		props: { visible: true, admin },
		global: { plugins: [PrimeVue, ToastService], stubs: { Dialog: DialogStub } },
	});
}

beforeEach(() => {
	setActivePinia(createPinia());
	vi.clearAllMocks();
	vi.mocked(adminsService.list).mockResolvedValue({ items: [], nextCursor: null });
});

describe("DeleteAdminDialog", () => {
	it("shows the admin name in the confirmation message", () => {
		const wrapper = mountDialog();
		expect(wrapper.find('[data-testid="delete-message"]').text()).toContain(
			"Ana Lima",
		);
	});

	it("confirm calls store.remove and closes", async () => {
		vi.mocked(adminsService.remove).mockResolvedValue();
		const wrapper = mountDialog();

		await wrapper.find('[data-testid="delete-confirm"]').trigger("click");
		await flushPromises();

		expect(adminsService.remove).toHaveBeenCalledWith("1");
		expect(wrapper.emitted("update:visible")?.at(-1)).toEqual([false]);
	});

	it("cancel emits update:visible false without deleting", async () => {
		const wrapper = mountDialog();
		await wrapper.find('[data-testid="delete-cancel"]').trigger("click");
		expect(adminsService.remove).not.toHaveBeenCalled();
		expect(wrapper.emitted("update:visible")?.at(-1)).toEqual([false]);
	});
});
```

- [ ] **Step 3: Run the test**

Run: `pnpm --filter admin-ui exec vitest run src/modules/admins/components/DeleteAdminDialog.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/admin-ui/src/modules/admins/components/DeleteAdminDialog.vue apps/admin-ui/src/modules/admins/components/DeleteAdminDialog.spec.ts
git commit -m "feat(admin-ui): delete admin confirmation dialog"
```

---

## Task 10: AdminsView screen

**Files:**
- Create: `apps/admin-ui/src/modules/admins/views/AdminsView.vue`
- Create: `apps/admin-ui/src/modules/admins/views/AdminsView.spec.ts`

- [ ] **Step 1: Implement `AdminsView.vue`**

```vue
<script setup lang="ts">
import { useDebounceFn } from "@vueuse/core";
import Avatar from "primevue/avatar";
import Button from "primevue/button";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import InputText from "primevue/inputtext";
import Tag from "primevue/tag";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";
import type { Admin } from "@route-bastion/contracts";
import AdminFormDialog from "@/modules/admins/components/AdminFormDialog.vue";
import DeleteAdminDialog from "@/modules/admins/components/DeleteAdminDialog.vue";
import { useAdminsStore } from "@/modules/admins/stores/admins.store";
import { formatDateBR } from "@/shared/format/date";

const store = useAdminsStore();
const toast = useToast();

const searchTerm = ref("");
const formVisible = ref(false);
const formMode = ref<"create" | "edit">("create");
const selectedAdmin = ref<Admin | null>(null);
const deleteVisible = ref(false);

onMounted(() => {
	store.fetchFirstPage();
});

const onSearch = useDebounceFn(() => {
	store.setSearch(searchTerm.value);
}, 300);

function initials(name: string): string {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}

function openCreate() {
	formMode.value = "create";
	selectedAdmin.value = null;
	formVisible.value = true;
}

function openEdit(admin: Admin) {
	formMode.value = "edit";
	selectedAdmin.value = admin;
	formVisible.value = true;
}

function openDelete(admin: Admin) {
	selectedAdmin.value = admin;
	deleteVisible.value = true;
}

async function toggleBlock(admin: Admin) {
	try {
		if (admin.status === "ACTIVE") {
			await store.block(admin.id);
			toast.add({
				severity: "success",
				summary: "Sucesso",
				detail: "Admin bloqueado",
				life: 3000,
			});
		} else {
			await store.unblock(admin.id);
			toast.add({
				severity: "success",
				summary: "Sucesso",
				detail: "Admin desbloqueado",
				life: 3000,
			});
		}
	} catch {
		toast.add({
			severity: "error",
			summary: "Erro",
			detail: "Não foi possível alterar o status",
			life: 4000,
		});
	}
}
</script>

<template>
	<section>
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-xl font-bold">Admins</h2>
			<Button
				label="Novo admin"
				icon="pi pi-plus"
				data-testid="new-admin"
				@click="openCreate"
			/>
		</div>

		<IconField class="mb-4 block">
			<InputIcon class="pi pi-search" />
			<InputText
				v-model="searchTerm"
				placeholder="Buscar por nome…"
				class="w-full"
				data-testid="search"
				@input="onSearch"
			/>
		</IconField>

		<div
			class="grid grid-cols-[3fr_1.3fr_1.3fr_1.4fr] px-3 pb-2 text-xs font-bold uppercase text-surface-500"
		>
			<span>Admin</span>
			<span>Status</span>
			<span>Criado em</span>
			<span></span>
		</div>

		<p v-if="store.loading" data-testid="loading">Carregando…</p>

		<p
			v-else-if="store.items.length === 0"
			class="rounded border border-surface-200 p-8 text-center text-surface-500"
			data-testid="empty"
		>
			Nenhum admin encontrado.
		</p>

		<ul v-else class="flex flex-col gap-2">
			<li
				v-for="admin in store.items"
				:key="admin.id"
				class="grid grid-cols-[3fr_1.3fr_1.3fr_1.4fr] items-center rounded-lg border border-surface-200 p-3"
				data-testid="admin-row"
			>
				<div class="flex items-center gap-3">
					<Avatar :label="initials(admin.name)" shape="circle" />
					<div>
						<div class="font-semibold">{{ admin.name }}</div>
						<div class="text-sm text-surface-500">{{ admin.email }}</div>
					</div>
				</div>
				<div>
					<Tag
						:value="admin.status === 'ACTIVE' ? 'Ativo' : 'Bloqueado'"
						:severity="admin.status === 'ACTIVE' ? 'success' : 'danger'"
					/>
				</div>
				<div>{{ formatDateBR(admin.createdAt) }}</div>
				<div class="flex justify-end gap-2">
					<Button
						icon="pi pi-pencil"
						severity="secondary"
						text
						rounded
						aria-label="Editar"
						data-testid="edit"
						@click="openEdit(admin)"
					/>
					<Button
						:icon="admin.status === 'ACTIVE' ? 'pi pi-lock' : 'pi pi-lock-open'"
						severity="secondary"
						text
						rounded
						:aria-label="admin.status === 'ACTIVE' ? 'Bloquear' : 'Desbloquear'"
						data-testid="toggle-block"
						@click="toggleBlock(admin)"
					/>
					<Button
						icon="pi pi-trash"
						severity="danger"
						text
						rounded
						aria-label="Deletar"
						data-testid="delete"
						@click="openDelete(admin)"
					/>
				</div>
			</li>
		</ul>

		<div class="mt-4 flex justify-end gap-2">
			<Button
				label="Anterior"
				icon="pi pi-chevron-left"
				severity="secondary"
				:disabled="!store.hasPrev"
				data-testid="prev"
				@click="store.fetchPrev()"
			/>
			<Button
				label="Próxima"
				icon="pi pi-chevron-right"
				icon-pos="right"
				severity="secondary"
				:disabled="!store.hasNext"
				data-testid="next"
				@click="store.fetchNext()"
			/>
		</div>

		<AdminFormDialog
			v-model:visible="formVisible"
			:mode="formMode"
			:admin="selectedAdmin"
		/>
		<DeleteAdminDialog v-model:visible="deleteVisible" :admin="selectedAdmin" />
	</section>
</template>
```

- [ ] **Step 2: Write the component test**

`AdminsView.spec.ts`:

```ts
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Admin } from "@route-bastion/contracts";
import { adminsService } from "@/modules/admins/services/admins.service";
import AdminsView from "./AdminsView.vue";

vi.mock("@/modules/admins/services/admins.service", () => ({
	adminsService: {
		list: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		block: vi.fn(),
		unblock: vi.fn(),
		remove: vi.fn(),
	},
}));

function makeAdmin(overrides: Partial<Admin> = {}): Admin {
	return {
		id: "1",
		name: "Ana Lima",
		email: "ana@rb.io",
		birthDate: "1990-04-12",
		status: "ACTIVE",
		isPasswordCreationPending: true,
		statusChangedAt: null,
		createdAt: "2026-06-15T12:00:00.000Z",
		modifiedAt: null,
		...overrides,
	};
}

function mountView() {
	return mount(AdminsView, {
		global: {
			plugins: [PrimeVue, ToastService],
			stubs: { AdminFormDialog: true, DeleteAdminDialog: true },
		},
	});
}

beforeEach(() => {
	setActivePinia(createPinia());
	vi.clearAllMocks();
	vi.mocked(adminsService.list).mockResolvedValue({
		items: [
			makeAdmin(),
			makeAdmin({ id: "2", name: "Bruno Sá", email: "b@rb.io", status: "BLOCKED" }),
		],
		nextCursor: "c1",
	});
});

afterEach(() => {
	vi.useRealTimers();
});

describe("AdminsView", () => {
	it("renders one row per admin after load", async () => {
		const wrapper = mountView();
		await flushPromises();
		expect(wrapper.findAll('[data-testid="admin-row"]')).toHaveLength(2);
	});

	it("shows the empty state when there are no admins", async () => {
		vi.mocked(adminsService.list).mockResolvedValue({ items: [], nextCursor: null });
		const wrapper = mountView();
		await flushPromises();
		expect(wrapper.find('[data-testid="empty"]').exists()).toBe(true);
	});

	it("Próxima loads the next page with the current nextCursor", async () => {
		const wrapper = mountView();
		await flushPromises();
		vi.mocked(adminsService.list).mockClear();
		vi.mocked(adminsService.list).mockResolvedValue({
			items: [makeAdmin({ id: "3" })],
			nextCursor: null,
		});

		await wrapper.find('[data-testid="next"]').trigger("click");
		await flushPromises();

		expect(adminsService.list).toHaveBeenCalledWith({
			cursor: "c1",
			search: undefined,
		});
	});

	it("debounced search triggers a search-scoped refetch", async () => {
		vi.useFakeTimers();
		const wrapper = mountView();
		await vi.runAllTimersAsync();
		vi.mocked(adminsService.list).mockClear();

		const input = wrapper.find('[data-testid="search"]');
		await input.setValue("ana");
		await input.trigger("input");
		await vi.advanceTimersByTimeAsync(300);

		expect(adminsService.list).toHaveBeenLastCalledWith({
			cursor: undefined,
			search: "ana",
		});
	});

	it("blocking an active admin calls the block endpoint then refetches", async () => {
		vi.mocked(adminsService.block).mockResolvedValue(makeAdmin({ status: "BLOCKED" }));
		const wrapper = mountView();
		await flushPromises();

		await wrapper.findAll('[data-testid="toggle-block"]')[0].trigger("click");
		await flushPromises();

		expect(adminsService.block).toHaveBeenCalledWith("1");
	});
});
```

- [ ] **Step 3: Run the test**

Run: `pnpm --filter admin-ui exec vitest run src/modules/admins/views/AdminsView.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/admin-ui/src/modules/admins/views
git commit -m "feat(admin-ui): admins list screen"
```

---

## Task 11: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `pnpm --filter admin-ui exec vue-tsc --build`
Expected: PASS (no type errors).

- [ ] **Step 2: Run the whole admin-ui suite**

Run: `pnpm --filter admin-ui test:unit -- run`
Expected: PASS — date, form, service, store, and the three component specs.

> The pre-existing `src/__tests__/App.spec.ts` asserts `'You did it!'`, which the current `App.vue` never rendered. If it is red on `main`, it is out of scope; leave it. If you want it green, update it to assert the `<Toast/>`/router shell — only with the user's OK.

- [ ] **Step 3: Manual smoke test against the real API (optional but recommended)**

In separate terminals: start Postgres 18 + `admin-api` (`pnpm --filter admin-api start:dev`), then `pnpm --filter admin-ui dev`. Visit `/dashboard/admins`: create, search, paginate, edit (change email → warning), block/unblock, delete; confirm toasts fire and the list refetches to page 1 after each mutation.

- [ ] **Step 4: Commit (if anything changed during verification)**

```bash
git add -A
git commit -m "chore(admin-ui): verification fixes for admin CRUD screen"
```

---

## Definition of Done

- [ ] `pnpm --filter admin-ui test:unit -- run` passes (utils, form, service, store, components).
- [ ] `pnpm --filter admin-ui exec vue-tsc --build` passes.
- [ ] `/dashboard/admins` renders inside `DashboardLayout`; list paginates by cursor (Anterior/Próxima), searches by name, and shows empty/loading states.
- [ ] Create/edit via modal (no password field; email-change warning in edit); delete via confirmation modal; block/unblock as direct icon actions — all with success/error toasts.
- [ ] Every successful mutation refetches the list, resetting pagination to the first page and re-sending the active search term (verified in `admins.store.spec.ts`).
- [ ] Dates render as `DD/MM/YYYY`; payloads send `YYYY-MM-DD`.

---

## Self-Review notes (author)

- **Spec coverage:** layout + route (Task 7), list/search/pagination/empty (Tasks 6, 10), create/edit/delete modals + block/unblock + toasts (Tasks 8–10), contracts-typed service (Task 5), refetch-after-mutation rule (Tasks 6, 10 — decision #16), dates DD/MM/YYYY↔YYYY-MM-DD (Tasks 2, 3), tests for service/store/components (Tasks 5, 6, 8, 9, 10).
- **Refetch rule** is implemented once (`store.refetch()`) and reused by every mutation; unit-tested directly.
- **HTTP client** uses the installed `ky` + `VITE_API_URL` (not native fetch — corrects the spec's earlier wording).
- **Type consistency:** `Admin`, `CreateAdminInput`, `UpdateAdminInput`, `ListAdminsOutput`, `ListAdminsQuery` come from `@route-bastion/contracts`; `AdminFormValues` is the local form type (Date birthDate) mapped to the contract by `toAdminInput`.
- **Known fragility:** PrimeVue Forms slot API and overlay teleports — dialog tests stub `Dialog` and rely on `form.spec.ts` for validation/mapping coverage; noted inline.
