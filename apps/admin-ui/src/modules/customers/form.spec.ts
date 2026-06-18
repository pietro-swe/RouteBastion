import { describe, expect, it } from "vitest";
import { customerFormSchema, toCustomerInput } from "./form";

const VALID_CNPJ = "11222333000181";

describe("customerFormSchema", () => {
	it("accepts a valid name and masked CNPJ", () => {
		const result = customerFormSchema.safeParse({
			name: "Acme Ltda",
			businessIdentifier: "11.222.333/0001-81",
		});
		expect(result.success).toBe(true);
	});

	it("rejects an empty name", () => {
		const result = customerFormSchema.safeParse({
			name: "",
			businessIdentifier: VALID_CNPJ,
		});
		expect(result.success).toBe(false);
	});

	it("rejects an invalid CNPJ", () => {
		const result = customerFormSchema.safeParse({
			name: "Acme",
			businessIdentifier: "12345678000100",
		});
		expect(result.success).toBe(false);
	});
});

describe("toCustomerInput", () => {
	it("normalizes the CNPJ to digits", () => {
		expect(
			toCustomerInput({
				name: "Acme Ltda",
				businessIdentifier: "11.222.333/0001-81",
			}),
		).toEqual({ name: "Acme Ltda", businessIdentifier: VALID_CNPJ });
	});
});
