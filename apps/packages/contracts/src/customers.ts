import { z } from "zod";

// Matches a 14-character sequence of a single repeated digit (e.g. 00000000000000).
const REPEATED_DIGITS = /^(\d)\1{13}$/;

function isValidCnpj(value: string): boolean {
	if (value.length !== 14) {
		return false;
	}

	if (REPEATED_DIGITS.test(value)) {
		return false;
	}

	const digits = value.split("").map(Number);

	const calcCheckDigit = (length: number): number => {
		let weight = length - 7;
		let sum = 0;

		for (let i = 0; i < length; i++) {
			sum += digits[i] * weight;
			weight = weight - 1 < 2 ? 9 : weight - 1;
		}

		const remainder = sum % 11;
		return remainder < 2 ? 0 : 11 - remainder;
	};

	return calcCheckDigit(12) === digits[12] && calcCheckDigit(13) === digits[13];
}

export const cnpjSchema = z
	.string()
	.transform((value) => value.replace(/\D/g, ""))
	.refine(isValidCnpj, { message: "CNPJ inválido" });

export const createCustomerInputSchema = z.object({
	name: z.string().min(1),
	businessIdentifier: cnpjSchema,
});
export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

export const updateCustomerInputSchema = z.object({
	name: z.string().min(1),
	businessIdentifier: cnpjSchema,
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;

export const customerOutputSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	businessIdentifier: z.string(),
	createdAt: z.iso.datetime(),
	modifiedAt: z.iso.datetime().nullable(),
});
export type Customer = z.infer<typeof customerOutputSchema>;

export const listCustomersQuerySchema = z.object({
	cursor: z.string().optional(),
	search: z.string().optional(),
});
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;

export const listCustomersOutputSchema = z.object({
	items: z.array(customerOutputSchema),
	nextCursor: z.string().nullable(),
});
export type ListCustomersOutput = z.infer<typeof listCustomersOutputSchema>;
