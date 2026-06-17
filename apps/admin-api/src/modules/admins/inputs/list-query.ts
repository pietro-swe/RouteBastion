import { listAdminsQuerySchema } from "@route-bastion/contracts";
import { createZodDto } from "nestjs-zod";

export class ListAdminsQuery extends createZodDto(listAdminsQuerySchema) {}
