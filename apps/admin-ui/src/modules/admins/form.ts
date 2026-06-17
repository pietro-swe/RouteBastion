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
