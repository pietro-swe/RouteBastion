import { createZodDto } from "nestjs-zod";
import z from "zod";

const schema = z.object({
	error: z.string(),
});

export class ErrorOutput extends createZodDto(schema) {}
