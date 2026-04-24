import { createZodDto } from "nestjs-zod";
import z from "zod";

const schema = z.object({
	name: z.string().min(1),
	email: z.email(),
	birthDate: z.iso.date(),
	password: z.string().min(12),
});

export class CreateUserInput extends createZodDto(schema) {}
