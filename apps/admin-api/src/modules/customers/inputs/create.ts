import { createCustomerInputSchema } from "@route-bastion/contracts";
import { createZodDto } from "nestjs-zod";

export class CreateCustomerInput extends createZodDto(
	createCustomerInputSchema,
) {}
