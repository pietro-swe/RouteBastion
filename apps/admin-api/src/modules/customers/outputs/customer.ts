import { customerOutputSchema } from "@route-bastion/contracts";
import { createZodDto } from "nestjs-zod";

export class CustomerOutput extends createZodDto(customerOutputSchema) {}
