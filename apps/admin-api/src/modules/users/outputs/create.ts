import { createZodDto } from "nestjs-zod";
import z from "zod";

const schema = z.object({
	id: z.uuid(),
	name: z.string(),
	email: z.email(),
	birthDate: z.iso.date(),
	createdAt: z.iso.date(),
	modifiedAt: z.iso.date().nullable(),
	deletedAt: z.iso.date().nullable(),
});

export class CreateUserOutput extends createZodDto(schema) {}
