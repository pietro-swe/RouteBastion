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

// biome-ignore lint/security/noSecrets: false positive — this is a test suite name, not a secret
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
