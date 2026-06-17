import { createAdminInputSchema } from "@route-bastion/contracts";
import { createZodDto } from "nestjs-zod";

export class CreateAdminInput extends createZodDto(createAdminInputSchema) {}
