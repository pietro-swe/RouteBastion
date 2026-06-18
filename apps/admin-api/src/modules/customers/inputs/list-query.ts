import { listCustomersQuerySchema } from "@route-bastion/contracts";
import { createZodDto } from "nestjs-zod";

export class ListCustomersQuery extends createZodDto(
	listCustomersQuerySchema,
) {}
