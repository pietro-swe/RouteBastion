import { describe, expect, it } from "vitest";
import {
	cnpjSchema,
	createCustomerInputSchema,
	customerOutputSchema,
	listCustomersOutputSchema,
	listCustomersQuerySchema,
	updateCustomerInputSchema,
} from "./customers";

// 11.222.333/0001-81 is a well-known valid CNPJ (check digits 8 and 1).
const VALID_CNPJ = "11222333000181";
const VALID_CNPJ_MASKED = "11.222.333/0001-81";

describe("cnpjSchema", () => {
	it("accepts a valid 14-digit CNPJ", () => {
		expect(cnpjSchema.parse(VALID_CNPJ)).toBe(VALID_CNPJ);
	});

	it("normalizes a masked CNPJ to digits only", () => {
		expect(cnpjSchema.parse(VALID_CNPJ_MASKED)).toBe(VALID_CNPJ);
	});

	it("rejects a CNPJ with a wrong check digit", () => {
		expect(() => cnpjSchema.parse("11222333000182")).toThrow();
	});

	it("rejects a CNPJ made of repeated digits", () => {
		expect(() => cnpjSchema.parse("00000000000000")).toThrow();
	});

	it("rejects a CNPJ with the wrong length", () => {
		expect(() => cnpjSchema.parse("1122233300018")).toThrow();
	});
});

describe("createCustomerInputSchema", () => {
	it("accepts a valid payload and normalizes the CNPJ", () => {
		expect(
			createCustomerInputSchema.parse({
				name: "Acme Ltda",
				businessIdentifier: VALID_CNPJ_MASKED,
			}),
		).toEqual({ name: "Acme Ltda", businessIdentifier: VALID_CNPJ });
	});

	it("rejects an empty name", () => {
		expect(() =>
			createCustomerInputSchema.parse({
				name: "",
				businessIdentifier: VALID_CNPJ,
			}),
		).toThrow();
	});

	it("rejects an invalid CNPJ", () => {
		expect(() =>
			createCustomerInputSchema.parse({
				name: "Acme",
				businessIdentifier: "12345678000100",
			}),
		).toThrow();
	});
});

describe("updateCustomerInputSchema", () => {
	it("requires name and businessIdentifier", () => {
		expect(() => updateCustomerInputSchema.parse({ name: "Acme" })).toThrow();
	});

	it("accepts a valid payload", () => {
		expect(
			updateCustomerInputSchema.parse({
				name: "Acme Ltda",
				businessIdentifier: VALID_CNPJ,
			}),
		).toEqual({ name: "Acme Ltda", businessIdentifier: VALID_CNPJ });
	});
});

describe("customerOutputSchema", () => {
	it("accepts a customer with nullable modifiedAt null", () => {
		const parsed = customerOutputSchema.parse({
			id: "018f8c2a-0000-7000-8000-000000000000",
			name: "Acme Ltda",
			businessIdentifier: VALID_CNPJ,
			createdAt: "2026-06-15T12:00:00.000Z",
			modifiedAt: null,
		});
		expect(parsed.businessIdentifier).toBe(VALID_CNPJ);
	});

	it("preserves a populated modifiedAt", () => {
		const full = {
			id: "018f8c2a-0000-7000-8000-000000000000",
			name: "Acme Ltda",
			businessIdentifier: VALID_CNPJ,
			createdAt: "2026-06-15T12:00:00.000Z",
			modifiedAt: "2026-06-16T08:30:00.000Z",
		};
		expect(customerOutputSchema.parse(full)).toEqual(full);
	});
});

describe("listCustomersQuerySchema", () => {
	it("allows an empty query", () => {
		expect(listCustomersQuerySchema.parse({})).toEqual({});
	});

	it("keeps cursor and search", () => {
		expect(
			listCustomersQuerySchema.parse({ cursor: "abc", search: "acme" }),
		).toEqual({ cursor: "abc", search: "acme" });
	});
});

describe("listCustomersOutputSchema", () => {
	it("accepts items + null nextCursor", () => {
		const parsed = listCustomersOutputSchema.parse({
			items: [],
			nextCursor: null,
		});
		expect(parsed.nextCursor).toBeNull();
	});

	it("accepts populated items + a non-null nextCursor", () => {
		const parsed = listCustomersOutputSchema.parse({
			items: [
				{
					id: "018f8c2a-0000-7000-8000-000000000000",
					name: "Acme Ltda",
					businessIdentifier: VALID_CNPJ,
					createdAt: "2026-06-15T12:00:00.000Z",
					modifiedAt: null,
				},
			],
			nextCursor: "next-page-token",
		});
		expect(parsed.items).toHaveLength(1);
		expect(parsed.nextCursor).toBe("next-page-token");
	});
});
