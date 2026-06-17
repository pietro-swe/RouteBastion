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
