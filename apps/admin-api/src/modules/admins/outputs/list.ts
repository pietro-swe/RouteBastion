import { listAdminsOutputSchema } from "@route-bastion/contracts";
import { createZodDto } from "nestjs-zod";

export class ListAdminsOutput extends createZodDto(listAdminsOutputSchema) {}
