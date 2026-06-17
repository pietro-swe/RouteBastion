import { updateCustomerInputSchema } from "@route-bastion/contracts";
import { createZodDto } from "nestjs-zod";

export class UpdateCustomerInput extends createZodDto(
	updateCustomerInputSchema,
) {}
