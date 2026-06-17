import { describe, expect, it } from "vitest";
import { formatCnpj } from "./cnpj";

describe("formatCnpj", () => {
	it("formats 14 digits as a masked CNPJ", () => {
		expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
	});

	it("strips existing punctuation before formatting", () => {
		expect(formatCnpj("11.222.333/0001-81")).toBe("11.222.333/0001-81");
	});

	it("returns the input unchanged when it is not 14 digits", () => {
		expect(formatCnpj("123")).toBe("123");
	});
});
