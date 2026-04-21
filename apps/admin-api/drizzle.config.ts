import "dotenv/config";

import { env } from "@Modules/config/env";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./drizzle",
	schema: [
		"./src/modules/infra/database/drizzle/enums",
		"./src/modules/infra/database/drizzle/tables",
	],
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
});
