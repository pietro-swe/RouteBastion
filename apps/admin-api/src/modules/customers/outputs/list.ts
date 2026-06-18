import { listCustomersOutputSchema } from "@route-bastion/contracts";
import { createZodDto } from "nestjs-zod";

export class ListCustomersOutput extends createZodDto(
	listCustomersOutputSchema,
) {}
