// biome-ignore-all lint: Output error to the console and exit with a non-zero code if the environment variables are invalid
import "dotenv/config";
import z from "zod";

const schema = z.object({
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	PORT: z.coerce.number().default(3000),
	DATABASE_URL: z.string(),
	REDIS_HOST: z.string(),
	REDIS_PORT: z.coerce.number().default(6379),
	REDIS_PASSWORD: z.string(),
});

const result = schema.safeParse(process.env);

if (!result.success) {
	console.error(
		"Invalid environment variables:",
		z.prettifyError(result.error),
	);

	process.exit(1);
}

export type Env = z.output<typeof schema>;

export const env = result.data;

export default () => result.data;
