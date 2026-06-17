import { adminOutputSchema } from "@route-bastion/contracts";
import { createZodDto } from "nestjs-zod";

export class AdminOutput extends createZodDto(adminOutputSchema) {}
