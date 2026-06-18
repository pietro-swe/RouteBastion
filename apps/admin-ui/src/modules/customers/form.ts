import { type CreateCustomerInput, cnpjSchema } from "@route-bastion/contracts";
import { z } from "zod";

const NON_DIGITS = /\D/g;

export const customerFormSchema = z.object({
	name: z.string().min(1, "Informe o nome"),
	businessIdentifier: cnpjSchema,
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export function toCustomerInput(values: {
	name: string;
	businessIdentifier: string;
}): CreateCustomerInput {
	return {
		name: values.name,
		businessIdentifier: values.businessIdentifier.replace(NON_DIGITS, ""),
	};
}
