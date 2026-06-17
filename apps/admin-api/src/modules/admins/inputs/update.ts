import { updateAdminInputSchema } from "@route-bastion/contracts";
import { createZodDto } from "nestjs-zod";

export class UpdateAdminInput extends createZodDto(updateAdminInputSchema) {}
